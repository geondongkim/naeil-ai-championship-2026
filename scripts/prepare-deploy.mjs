import { copyFile, lstat, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSafeContent, buildPublic, fileRecord, projectRoot } from './build.mjs';

const deploymentSources = Object.freeze([
  { path: 'api/analyze.mjs', source: 'api/analyze.mjs' },
  { path: 'vercel.json', source: 'vercel.json' },
]);

async function requireSource(rootDir, relativePath) {
  const absolutePath = path.resolve(rootDir, relativePath);
  if (!absolutePath.startsWith(`${path.resolve(rootDir)}${path.sep}`)) {
    throw new Error(`Deployment source escapes its root: ${relativePath}`);
  }
  const stat = await lstat(absolutePath);
  if (!stat.isFile()) throw new Error(`Deployment source is not a regular file: ${relativePath}`);
  return absolutePath;
}

export async function prepareDeployment({
  rootDir = projectRoot,
  publicDir = path.join(rootDir, 'public'),
  distDir = path.join(rootDir, 'dist'),
  tempRoot = path.join(rootDir, 'tmp'),
  writeLatestReport = true,
} = {}) {
  const build = await buildPublic({ publicDir, distDir, writeLatestReport: false });
  await mkdir(tempRoot, { recursive: true });
  const directory = await mkdtemp(path.join(tempRoot, 'naeil-deploy-source-'));
  const files = [];

  for (const entry of build.files) {
    const source = await requireSource(distDir, entry.path);
    const content = await readFile(source);
    assertSafeContent(entry.path, content);
    const deployedPath = `public/${entry.path}`;
    const target = path.join(directory, deployedPath);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
    files.push(fileRecord(deployedPath, content));
  }

  for (const entry of deploymentSources) {
    const source = await requireSource(rootDir, entry.source);
    const content = await readFile(source);
    assertSafeContent(entry.path, content);
    const target = path.join(directory, entry.path);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
    files.push(fileRecord(entry.path, content));
  }

  const packageContent = Buffer.from(`${JSON.stringify({
    private: true,
    type: 'module',
    engines: { node: '>=22' },
  }, null, 2)}\n`);
  await writeFile(path.join(directory, 'package.json'), packageContent);
  files.push(fileRecord('package.json', packageContent));

  const report = {
    directory,
    preparedAt: new Date().toISOString(),
    fileCount: files.length,
    totalBytes: files.reduce((total, file) => total + file.bytes, 0),
    files,
  };
  if (writeLatestReport) {
    await writeFile(path.join(tempRoot, 'deploy-source-latest.json'), `${JSON.stringify(report, null, 2)}\n`);
  }
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await prepareDeployment();
  console.log(JSON.stringify({
    directory: report.directory,
    files: report.fileCount,
    bytes: report.totalBytes,
    format: 'Vercel source deployment',
  }, null, 2));
}
