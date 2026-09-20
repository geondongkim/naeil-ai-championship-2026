import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

async function readText(relativePath) {
  return readFile(new URL(relativePath, root), 'utf8');
}

async function readDeterministicJson(relativePath) {
  const raw = await readText(relativePath);
  const parsed = JSON.parse(raw);
  assert.equal(raw, `${JSON.stringify(parsed, null, 2)}\n`, `${relativePath} must use deterministic two-space JSON`);
  return parsed;
}

test('catalog JSON is deterministic and uses stable unique IDs', async () => {
  const catalog = await readDeterministicJson('public/data/catalog.json');
  assert.equal(catalog.schemaVersion, '1.0.0');
  assert.equal(catalog.catalogId, 'naeil-public-catalog-v1');
  assert.equal(catalog.product.model, 'one-product-two-fields');
  assert.deepEqual(catalog.product.fields, ['manufacturing', 'small-business']);

  const records = [
    ...catalog.collectionGates,
    ...catalog.occupationPaths,
    ...catalog.syntheticExamples,
    ...catalog.externalCatalogCandidates,
  ];
  const ids = records.map((record) => record.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /^[a-z]+-[a-z0-9-]+$/.test(id)));
});

test('synthetic examples cover both fields without implying collection or approval', async () => {
  const catalog = await readDeterministicJson('public/data/catalog.json');
  assert.equal(catalog.syntheticExamples.length, 12);
  assert.deepEqual(
    Object.fromEntries(['manufacturing', 'small-business'].map((field) => [
      field,
      catalog.syntheticExamples.filter((item) => item.field === field).length,
    ])),
    { manufacturing: 6, 'small-business': 6 },
  );

  for (const item of catalog.syntheticExamples) {
    assert.equal(item.sourceType, 'AI-generated synthetic example');
    assert.equal(item.collectionState, 'not-collected');
    assert.equal(item.trainingApproval, 'not-approved');
    assert.equal(item.provenance.authorship, 'clean-room-authored-synthetic-scenario');
    assert.equal(item.provenance.thirdPartyMediaUsed, false);
    assert.equal(item.rights.codeLicenseApplies, false);
    assert.match(item.usageBoundary, /청년 수행/);
    assert.match(item.usageBoundary, /승인 학습 데이터/);
    assert.equal(item.observationCount, 10);
    assert.equal(item.observationDatasetRef, 'public/data/synthetic-observations.json');
    assert.equal(item.qualityTaxonomyRef, 'public/data/quality-taxonomy.json');
  }
  const linked = catalog.syntheticExamples.filter((item) => item.assetRefs.length > 0);
  const metadataOnly = catalog.syntheticExamples.filter((item) => item.assetRefs.length === 0);
  assert.equal(linked.length, 3);
  assert.equal(metadataOnly.length, 9);
  assert.ok(linked.every((item) => item.status === 'synthetic-raster-linked-not-collected'));
  assert.ok(linked.every((item) => item.rights.status === 'project-use-only'));
  assert.ok(metadataOnly.every((item) => item.status === 'scenario-metadata-only-no-raster'));
  assert.ok(metadataOnly.every((item) => item.rights.status === 'metadata-only'));
});

test('external catalogs are truthful disconnected links and never Live APIs', async () => {
  const catalog = await readDeterministicJson('public/data/catalog.json');
  assert.deepEqual(
    catalog.externalCatalogCandidates.map((item) => item.officialCatalogName),
    ['KAMP AI', 'AI Hub', 'data.go.kr'],
  );
  for (const item of catalog.externalCatalogCandidates) {
    assert.match(item.id, /^ext-00[1-3]-/);
    assert.equal(item.sourceType, 'External catalog link');
    assert.equal(item.status, 'candidate-not-connected');
    assert.equal(item.liveApi, false);
    assert.equal(item.rights.status, 'dataset-specific-terms-not-reviewed');
    assert.match(item.usageBoundary, /Live API가 아님/);
  }
});

test('six occupation paths remain proposals rather than employment outcomes', async () => {
  const catalog = await readDeterministicJson('public/data/catalog.json');
  assert.equal(catalog.occupationPaths.length, 6);
  catalog.occupationPaths.forEach((path, index) => {
    assert.match(path.id, new RegExp(`^occ-00${index + 1}-`));
    assert.equal(path.status, 'proposed-career-path');
    assert.ok(path.evidence.length >= 3);
    assert.match(path.outcomeBoundary, /고용 또는 배치 성과가 아님/);
  });
});

test('asset manifest preserves partial provenance and records completed imagegen assets', async () => {
  const manifest = await readDeterministicJson('public/assets/asset-manifest.json');
  const catalog = await readDeterministicJson('public/data/catalog.json');
  assert.equal(manifest.status, 'active-with-synthetic-assets');
  assert.equal(manifest.assets.length, 11);
  assert.equal(manifest.licenseBoundary.codeLicenseAppliesByDefault, false);
  assert.equal(manifest.licenseBoundary.defaultAssetPermission, 'none');
  assert.equal(manifest.recordContract.sourceTypeValue, 'AI-generated synthetic example');
  assert.equal(manifest.recordContract.hashAlgorithm, 'sha256');
  for (const field of ['generation', 'prompt', 'file', 'rights', 'syntheticBoundary']) {
    assert.ok(manifest.recordContract.required.includes(field));
  }
  assert.deepEqual(
    manifest.recordContract.syntheticBoundaryRequired,
    ['notFieldCollection', 'notYouthWork', 'notPartnerData', 'notApprovedTrainingData'],
  );
  const manifestIds = new Set(manifest.assets.map((asset) => asset.id));
  const catalogRefs = catalog.syntheticExamples.flatMap((item) => item.assetRefs);
  assert.ok(catalogRefs.every((assetId) => manifestIds.has(assetId)));
  const partialAssets = manifest.assets.filter(
    (asset) => asset.provenanceCompleteness === 'partial-full-prompt-not-recorded',
  );
  const completedAssets = manifest.assets.filter(
    (asset) => asset.provenanceCompleteness === 'complete-exact-prompt-generator-file-and-human-review',
  );
  assert.equal(partialAssets.length, 3);
  assert.equal(completedAssets.length, 8);
  for (const asset of manifest.assets) {
    assert.equal(asset.sourceType, 'AI-generated synthetic example');
    assert.equal(asset.generation.tool, 'OpenAI image_gen');
    assert.equal(asset.generation.sessionType, 'local-imagegen-session');
    assert.equal(asset.generation.generatedLocally, true);
    assert.equal(asset.rights.status, 'project-use-granted');
    assert.equal(asset.rights.codeLicenseApplies, false);
    assert.deepEqual(Object.values(asset.syntheticBoundary), [true, true, true, true]);
    const bytes = await readFile(new URL(asset.filePath, root));
    assert.equal(asset.file.byteLength, bytes.length);
    assert.equal(asset.file.sha256, createHash('sha256').update(bytes).digest('hex'));
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    assert.equal(asset.file.pixelWidth, bytes.readUInt32BE(16));
    assert.equal(asset.file.pixelHeight, bytes.readUInt32BE(20));
  }
  for (const asset of partialAssets) {
    assert.equal(asset.generation.localSourceId, null);
    assert.equal(asset.prompt.status, 'not-recorded');
    assert.equal(asset.prompt.sha256, null);
  }
  const expectedCompletedPrompts = new Map([
    ['asset-mfg-001-component-surface-baseline-accepted', 'fbb1fdaf96a455bb7e8c8b78dcc69a8e3055fe8dc57b3ea722cabdd16f2dfce3'],
    ['asset-mfg-002-fastener-tray-baseline-accepted', 'a3b7a0495ab8fb0f5f171046e952a253c0dd9d4e3b2730ed78db60cea492528a'],
    ['asset-mfg-003-safety-zone-baseline-accepted', '484b18822d089f8e3fc4c7395b8615f356d96cb413129abbc81ac07ffac6bce2'],
    ['asset-smb-003-produce-weighing-baseline-accepted', '1a2afa81abee36a3c7303aafc76ed58e15fa79c173fb547f000a2a0d6ed18f32'],
    ['asset-smb-004-florist-wrapping-baseline-accepted', 'c486c0c21633faa407f441b90dd8b86a011fa440fdc1a4d9d1ecacfcb2b1ef9d'],
    ['asset-smb-006-ingredient-bin-baseline-accepted', '64642e5f354547b7936ddd29fe08933fcc27a3b5915d049598ba82e21db41be8'],
    ['asset-mfg-004-packaging-check-baseline-accepted', 'f6743023b5add6a47c9c9e18d26edd1b86918d4787ac37ca3b06b82c457963fe'],
    ['asset-mfg-005-bin-label-baseline-accepted', '4e62144865e40f31575b378f25a6b3e24fab6d1e11583358cc1bfbe27d2ad538'],
  ]);
  for (const completed of completedAssets) {
    assert.equal(completed.prompt.status, 'recorded');
    assert.equal(completed.prompt.sha256, expectedCompletedPrompts.get(completed.id));
    assert.equal(completed.humanReview.decisionAuthority, 'human');
    assert.equal(completed.humanReview.status, 'passed-for-prototype-illustration');
  }
});

test('documentation states clean-room, truth, and license boundaries', async () => {
  const readme = await readText('README.md');
  const submission = await readText('docs/SUBMISSION.md');
  const license = await readText('LICENSE');
  const combined = `${readme}\n${submission}`;

  assert.match(combined, /하나의 현장 데이터 운영 제품|한 제품 안의 두 현장/);
  assert.match(combined, /다른 저장소의.*복사하지 않았습니다/s);
  assert.match(combined, /다른 저장소.*이력.*지우거나 대체하지 않습니다/s);
  assert.match(combined, /Live API[^\n]*아닙니다/);
  assert.match(combined, /고용 성과가 아닙니다/);
  assert.match(license, /MIT License/);
  assert.match(license, /applies only to software source code and automated tests/);
  assert.match(license, /Raster assets are outside this code license/);
});

test('owned public files contain no high-confidence secrets or contact PII', async () => {
  const files = [
    'README.md',
    'LICENSE',
    'docs/SUBMISSION.md',
    'public/data/catalog.json',
    'public/assets/asset-manifest.json',
  ];
  const secretPattern = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{20,}\b|\bAKIA[0-9A-Z]{16}\b|\bAIza[0-9A-Za-z_-]{30,}\b|\bgh[pousr]_[A-Za-z0-9]{20,}\b|\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g;
  const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  const phonePattern = /(?<!\d)01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)/g;
  const findings = [];

  for (const file of files) {
    const text = await readText(file);
    if (secretPattern.test(text)) findings.push({ file, kind: 'secret-pattern' });
    secretPattern.lastIndex = 0;
    if (emailPattern.test(text)) findings.push({ file, kind: 'email-pattern' });
    emailPattern.lastIndex = 0;
    if (phonePattern.test(text)) findings.push({ file, kind: 'phone-pattern' });
    phonePattern.lastIndex = 0;
  }
  assert.deepEqual(findings, []);
});
