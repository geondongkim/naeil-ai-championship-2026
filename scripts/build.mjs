import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export const requiredPublicPaths = Object.freeze([
  'index.html',
  'app.css',
  'app.mjs',
  'assets/naeil-mark.svg',
  'assets/field-orbit.svg',
  'assets/synthetic-workcell.svg',
  'data/catalog.json',
  'data/career-evidence.json',
  'data/dataset-coverage.json',
  'data/dataset-index.json',
  'data/evaluation-cases.json',
  'data/image-generation-completions.json',
  'data/image-generation-queue.json',
  'data/image-rights-policy.json',
  'data/quality-taxonomy.json',
  'data/recollection-tasks.json',
  'data/review-events.json',
  'data/role-task-matrix.json',
  'data/synthetic-observations.json',
  'data/training-catalog.json',
  'assets/asset-manifest.json',
]);

export const secretPattern = /OPENAI_API_KEY\s*=\s*\S+|sk-[A-Za-z0-9_-]{20,}|SUPABASE_SERVICE_ROLE_KEY|sb_secret_|sbp_[A-Za-z0-9]{20,}|postgres(?:ql)?:\/\/|-----BEGIN [^-]*PRIVATE KEY-----/;

function normalizeManifestAsset(raw) {
  if (typeof raw !== 'string') return null;
  let candidate = raw.trim();
  if (candidate.startsWith('./')) candidate = candidate.slice(2);
  if (candidate.startsWith('/')) candidate = candidate.slice(1);
  if (candidate.startsWith('public/')) candidate = candidate.slice('public/'.length);
  if (!candidate.startsWith('assets/')) return null;
  if (candidate.includes('\\') || candidate.split('/').includes('..')) {
    throw new Error(`Unsafe asset-manifest path: ${raw}`);
  }
  if (!path.posix.extname(candidate)) return null;
  if (!/^assets\/[A-Za-z0-9][A-Za-z0-9._/-]*\.[A-Za-z0-9]+$/.test(candidate)) {
    throw new Error(`Invalid asset-manifest path: ${raw}`);
  }
  return candidate;
}

function collectManifestAssets(value, output = new Set()) {
  if (typeof value === 'string') {
    const candidate = normalizeManifestAsset(value);
    if (candidate) output.add(candidate);
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectManifestAssets(item, output);
    return output;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectManifestAssets(item, output);
  }
  return output;
}

async function requireRegularFile(root, relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  if (!absolutePath.startsWith(`${path.resolve(root)}${path.sep}`)) {
    throw new Error(`Public path escapes its root: ${relativePath}`);
  }
  let stat;
  try {
    stat = await lstat(absolutePath);
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error(`Required public input is missing: public/${relativePath}`);
    throw error;
  }
  if (!stat.isFile()) throw new Error(`Required public input is not a regular file: public/${relativePath}`);
  return absolutePath;
}

export async function resolvePublicAllowlist({ publicDir = path.join(projectRoot, 'public') } = {}) {
  const manifestPath = await requireRegularFile(publicDir, 'assets/asset-manifest.json');
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid public/assets/asset-manifest.json: ${error.message}`);
  }
  const referencedAssets = [...collectManifestAssets(manifest)].sort();
  const syntheticImages = referencedAssets.filter((entry) => entry.endsWith('-synthetic.png'));
  if (syntheticImages.length !== 3) {
    throw new Error(`public/assets/asset-manifest.json must reference exactly three *-synthetic.png assets; found ${syntheticImages.length}`);
  }
  const allowlist = [...new Set([...requiredPublicPaths, ...referencedAssets])].sort();
  for (const relativePath of allowlist) await requireRegularFile(publicDir, relativePath);
  return allowlist;
}

export function fileRecord(relativePath, content) {
  return {
    path: relativePath,
    bytes: content.length,
    sha256: createHash('sha256').update(content).digest('hex'),
  };
}

export function assertSafeContent(relativePath, content) {
  if (/\.(?:css|html|js|json|mjs|svg|txt)$/i.test(relativePath) && secretPattern.test(content.toString('utf8'))) {
    throw new Error(`Potential secret found in public build input: ${relativePath}`);
  }
}

export async function buildPublic({
  publicDir = path.join(projectRoot, 'public'),
  distDir = path.join(projectRoot, 'dist'),
  writeLatestReport = true,
  reportPath = path.join(projectRoot, 'tmp', 'build-latest.json'),
} = {}) {
  const allowlist = await resolvePublicAllowlist({ publicDir });
  const parent = path.dirname(distDir);
  await mkdir(parent, { recursive: true });
  const staging = await mkdtemp(path.join(parent, '.naeil-build-'));
  const files = [];
  try {
    for (const relativePath of allowlist) {
      const source = await requireRegularFile(publicDir, relativePath);
      const content = await readFile(source);
      assertSafeContent(relativePath, content);
      const target = path.join(staging, relativePath);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(source, target);
      files.push(fileRecord(relativePath, content));
    }
    await rm(distDir, { recursive: true, force: true });
    await rename(staging, distDir);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }

  const report = {
    directory: distDir,
    preparedAt: new Date().toISOString(),
    fileCount: files.length,
    totalBytes: files.reduce((total, file) => total + file.bytes, 0),
    files,
  };
  if (writeLatestReport) {
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await buildPublic();
  console.log(JSON.stringify({
    directory: report.directory,
    files: report.fileCount,
    bytes: report.totalBytes,
    format: 'explicit public allowlist',
  }, null, 2));
}
