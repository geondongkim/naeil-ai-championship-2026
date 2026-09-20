import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildPublic, requiredPublicPaths, resolvePublicAllowlist } from '../scripts/build.mjs';
import { prepareDeployment } from '../scripts/prepare-deploy.mjs';

const syntheticAssets = [
  'assets/manufacturing-inspection-synthetic.png',
  'assets/bakery-rack-synthetic.png',
  'assets/cafe-cup-sorting-synthetic.png',
];

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'naeil-build-test-'));
  const publicDir = path.join(root, 'public');
  const files = {
    'index.html': '<!doctype html><title>NAEIL</title>',
    'app.css': 'body { color: #123; }',
    'app.mjs': 'document.documentElement.dataset.app = "naeil";',
    'assets/naeil-mark.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
    'assets/field-orbit.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
    'data/catalog.json': '{"product":"NAEIL"}\n',
    'assets/asset-manifest.json': `${JSON.stringify({ assets: syntheticAssets.map((asset) => ({ path: asset })) }, null, 2)}\n`,
    ...Object.fromEntries(syntheticAssets.map((asset, index) => [asset, Buffer.from([0x89, 0x50, 0x4e, 0x47, index])])),
  };
  for (const [relativePath, content] of Object.entries(files)) {
    const target = path.join(publicDir, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  return { root, publicDir, files };
}

async function walk(root) {
  const output = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(full);
      else output.push(path.relative(root, full));
    }
  }
  await visit(root);
  return output.sort();
}

test('build resolves only required public files and manifest-referenced assets', async (t) => {
  const context = await fixture();
  t.after(() => rm(context.root, { recursive: true, force: true }));
  await writeFile(path.join(context.publicDir, 'private-notes.md'), 'must not deploy');
  await writeFile(path.join(context.publicDir, '.env'), 'must not deploy');
  const allowlist = await resolvePublicAllowlist({ publicDir: context.publicDir });
  assert.deepEqual(allowlist, [...new Set([...requiredPublicPaths, ...syntheticAssets])].sort());

  const distDir = path.join(context.root, 'dist');
  const report = await buildPublic({ publicDir: context.publicDir, distDir, writeLatestReport: false });
  assert.deepEqual(await walk(distDir), allowlist);
  assert.equal(report.fileCount, allowlist.length);
  assert.ok(report.files.every(({ sha256 }) => /^[a-f0-9]{64}$/.test(sha256)));
  assert.equal((await walk(distDir)).includes('.env'), false);
  assert.equal((await walk(distDir)).includes('private-notes.md'), false);
});

test('build fails clearly when catalog or provenance inputs are missing', async (t) => {
  const context = await fixture();
  t.after(() => rm(context.root, { recursive: true, force: true }));
  await rm(path.join(context.publicDir, 'data/catalog.json'));
  await assert.rejects(
    () => buildPublic({ publicDir: context.publicDir, distDir: path.join(context.root, 'dist'), writeLatestReport: false }),
    /Required public input is missing: public\/data\/catalog\.json/,
  );
});

test('deployment source contains only allowlisted public files, one API and minimal config', async (t) => {
  const context = await fixture();
  t.after(() => rm(context.root, { recursive: true, force: true }));
  const distDir = path.join(context.root, 'dist');
  const tempRoot = path.join(context.root, 'tmp');
  const report = await prepareDeployment({
    publicDir: context.publicDir,
    distDir,
    tempRoot,
    writeLatestReport: false,
  });
  const paths = await walk(report.directory);
  const allowlist = await resolvePublicAllowlist({ publicDir: context.publicDir });
  const expected = [
    ...allowlist.map((entry) => `public/${entry}`),
    'api/analyze.mjs',
    'package.json',
    'vercel.json',
  ].sort();
  assert.deepEqual(paths, expected);
  assert.equal(paths.filter((entry) => entry.startsWith('api/')).length, 1);
  assert.equal(paths.some((entry) => /(^|\/)\.env(?:\.|$)|(^|\/)(docs|tests|scripts)(\/|$)/.test(entry)), false);
  assert.equal(paths.filter((entry) => entry.endsWith('-synthetic.png')).length, 3);
  assert.ok(paths.includes('public/data/catalog.json'));
  assert.ok(paths.includes('public/assets/asset-manifest.json'));

  for (const record of report.files) {
    const target = path.join(report.directory, record.path);
    assert.equal((await lstat(target)).isFile(), true);
    const content = await readFile(target);
    assert.equal(record.bytes, content.length);
    assert.equal(record.sha256, createHash('sha256').update(content).digest('hex'));
  }
});

test('Vercel config exposes one bounded function with no-store API responses', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(config.functions), ['api/analyze.mjs']);
  assert.equal(config.functions['api/analyze.mjs'].maxDuration, 30);
  const apiHeaders = config.headers.find(({ source }) => source === '/api/(.*)')?.headers ?? [];
  assert.ok(apiHeaders.some(({ key, value }) => key === 'Cache-Control' && value === 'no-store'));
});
