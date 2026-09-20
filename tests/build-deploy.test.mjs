import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildPublic, bundledDependencyAssets, requiredPublicPaths, resolvePublicAllowlist } from '../scripts/build.mjs';
import { prepareDeployment } from '../scripts/prepare-deploy.mjs';

const syntheticAssets = [
  'assets/manufacturing-inspection-synthetic.png',
  'assets/bakery-rack-synthetic.png',
  'assets/cafe-cup-sorting-synthetic.png',
];
const completedAssets = [
  'assets/generated/syn-mfg-001-component-surface-baseline-accepted.png',
  'assets/generated/syn-mfg-002-fastener-tray-baseline-accepted.png',
  'assets/generated/syn-mfg-003-safety-zone-baseline-accepted.png',
  'assets/generated/syn-smb-003-produce-weighing-baseline-accepted.png',
  'assets/generated/syn-smb-004-florist-wrapping-baseline-accepted.png',
  'assets/generated/syn-smb-006-ingredient-bin-baseline-accepted.png',
  'assets/generated/syn-mfg-004-packaging-check-baseline-accepted.png',
  'assets/generated/syn-mfg-005-bin-label-baseline-accepted.png',
];
const manifestAssets = [...syntheticAssets, ...completedAssets];

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'naeil-build-test-'));
  const publicDir = path.join(root, 'public');
  const files = {
    'index.html': '<!doctype html><title>NAEIL</title>',
    'app.css': 'body { color: #123; }',
    'app.mjs': 'document.documentElement.dataset.app = "naeil";',
    'assets/naeil-mark.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
    'assets/field-orbit.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
    'assets/synthetic-workcell.svg': '<svg xmlns="http://www.w3.org/2000/svg"><title>Synthetic workcell</title></svg>',
    'data/catalog.json': '{"product":"NAEIL"}\n',
    'data/career-evidence.json': '{"datasetId":"naeil-synthetic-career-evidence-v1","evidenceCount":120}\n',
    'data/dataset-coverage.json': '{"coverageId":"naeil-synthetic-dataset-coverage-v1","coverageDimensionCount":10}\n',
    'data/dataset-index.json': '{"indexId":"naeil-public-dataset-index-v1","artifactCount":14}\n',
    'data/evaluation-cases.json': '{"datasetId":"naeil-metadata-only-synthetic-evaluation-cases-v1","caseCount":96}\n',
    'data/image-generation-completions.json': '{"ledgerId":"naeil-synthetic-image-generation-completions-v1","completionCount":8}\n',
    'data/image-generation-queue.json': '{"queueId":"naeil-synthetic-image-generation-queue-v1","itemCount":36}\n',
    'data/image-rights-policy.json': '{"policyId":"naeil-synthetic-image-rights-policy-v1","policyItemCount":8}\n',
    'data/quality-taxonomy.json': '{"taxonomyId":"naeil-synthetic-quality-taxonomy-v1"}\n',
    'data/recollection-tasks.json': '{"datasetId":"naeil-synthetic-recollection-tasks-v1"}\n',
    'data/review-events.json': '{"datasetId":"naeil-synthetic-review-events-v1"}\n',
    'data/role-task-matrix.json': '{"matrixId":"naeil-synthetic-role-task-matrix-v1","mappingCount":72}\n',
    'data/synthetic-observations.json': '{"datasetId":"naeil-synthetic-observations-v1","recordCount":120}\n',
    'data/training-catalog.json': '{"catalogId":"naeil-synthetic-training-catalog-v1","moduleCount":18}\n',
    'assets/asset-manifest.json': `${JSON.stringify({ assets: manifestAssets.map((asset) => ({ path: asset })) }, null, 2)}\n`,
    ...Object.fromEntries(manifestAssets.map((asset, index) => [asset, Buffer.from([0x89, 0x50, 0x4e, 0x47, index])])),
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
  assert.deepEqual(allowlist, [...new Set([...requiredPublicPaths, ...manifestAssets])].sort());
  assert.ok(allowlist.includes('assets/field-orbit.svg'));
  assert.ok(allowlist.includes('assets/synthetic-workcell.svg'));
  assert.ok(allowlist.includes('data/career-evidence.json'));
  assert.ok(allowlist.includes('data/dataset-coverage.json'));
  assert.ok(allowlist.includes('data/dataset-index.json'));
  assert.ok(allowlist.includes('data/evaluation-cases.json'));
  assert.ok(allowlist.includes('data/image-generation-completions.json'));
  assert.ok(allowlist.includes('data/image-generation-queue.json'));
  assert.ok(allowlist.includes('data/image-rights-policy.json'));
  assert.ok(allowlist.includes('data/quality-taxonomy.json'));
  assert.ok(allowlist.includes('data/recollection-tasks.json'));
  assert.ok(allowlist.includes('data/review-events.json'));
  assert.ok(allowlist.includes('data/role-task-matrix.json'));
  assert.ok(allowlist.includes('data/synthetic-observations.json'));
  assert.ok(allowlist.includes('data/training-catalog.json'));

  const distDir = path.join(context.root, 'dist');
  const report = await buildPublic({ publicDir: context.publicDir, distDir, writeLatestReport: false });
  const bundledPaths = bundledDependencyAssets.map(({ path: bundledPath }) => bundledPath);
  assert.deepEqual(await walk(distDir), [...allowlist, ...bundledPaths].sort());
  assert.equal(report.fileCount, allowlist.length + bundledPaths.length);
  assert.ok(bundledPaths.every((bundledPath) => report.files.some(({ path: reportPath }) => reportPath === bundledPath)));
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

test('build requires the synthetic lifecycle data inputs', async (t) => {
  for (const requiredPath of [
    'data/synthetic-observations.json',
    'data/quality-taxonomy.json',
    'data/review-events.json',
    'data/recollection-tasks.json',
    'data/training-catalog.json',
    'data/role-task-matrix.json',
    'data/career-evidence.json',
    'data/dataset-coverage.json',
    'data/dataset-index.json',
    'data/evaluation-cases.json',
    'data/image-generation-completions.json',
    'data/image-generation-queue.json',
    'data/image-rights-policy.json',
  ]) {
    await t.test(requiredPath, async (subtest) => {
      const context = await fixture();
      subtest.after(() => rm(context.root, { recursive: true, force: true }));
      await rm(path.join(context.publicDir, requiredPath));
      await assert.rejects(
        () => buildPublic({ publicDir: context.publicDir, distDir: path.join(context.root, 'dist'), writeLatestReport: false }),
        new RegExp(`Required public input is missing: public/${requiredPath.replace('.', '\\.')}`),
      );
    });
  }
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
    ...bundledDependencyAssets.map(({ path: bundledPath }) => `public/${bundledPath}`),
    'api/analyze.mjs',
    'package.json',
    'vercel.json',
  ].sort();
  assert.deepEqual(paths, expected);
  assert.equal(paths.filter((entry) => entry.startsWith('api/')).length, 1);
  assert.equal(paths.some((entry) => /(^|\/)\.env(?:\.|$)|(^|\/)(docs|tests|scripts)(\/|$)/.test(entry)), false);
  assert.equal(paths.filter((entry) => entry.endsWith('-synthetic.png')).length, 3);
  assert.ok(paths.includes('public/data/catalog.json'));
  assert.ok(paths.includes('public/data/career-evidence.json'));
  assert.ok(paths.includes('public/data/dataset-coverage.json'));
  assert.ok(paths.includes('public/data/dataset-index.json'));
  assert.ok(paths.includes('public/data/evaluation-cases.json'));
  assert.ok(paths.includes('public/data/image-generation-completions.json'));
  assert.ok(paths.includes('public/data/image-generation-queue.json'));
  assert.ok(paths.includes('public/data/image-rights-policy.json'));
  assert.ok(paths.includes('public/data/quality-taxonomy.json'));
  assert.ok(paths.includes('public/data/recollection-tasks.json'));
  assert.ok(paths.includes('public/data/review-events.json'));
  assert.ok(paths.includes('public/data/role-task-matrix.json'));
  assert.ok(paths.includes('public/data/synthetic-observations.json'));
  assert.ok(paths.includes('public/data/training-catalog.json'));
  assert.ok(paths.includes('public/assets/asset-manifest.json'));
  assert.ok(paths.includes('public/assets/field-orbit.svg'));
  assert.ok(paths.includes('public/assets/synthetic-workcell.svg'));
  assert.ok(completedAssets.every((asset) => paths.includes(`public/${asset}`)));
  assert.equal(report.fileCount, 37);

  const workcellSource = await readFile(path.join(context.publicDir, 'assets/synthetic-workcell.svg'));
  const workcellDeployed = await readFile(path.join(report.directory, 'public/assets/synthetic-workcell.svg'));
  const workcellRecord = report.files.find(({ path: recordPath }) => recordPath === 'public/assets/synthetic-workcell.svg');
  assert.deepEqual(workcellDeployed, workcellSource);
  assert.equal(workcellRecord.sha256, createHash('sha256').update(workcellSource).digest('hex'));

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
