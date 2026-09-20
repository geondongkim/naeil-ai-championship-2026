import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildPublic, projectRoot } from '../scripts/build.mjs';
import { buildSyntheticArtifacts, DEFAULT_SEED } from '../scripts/generate-synthetic-dataset.mjs';

const root = new URL('../', import.meta.url);
const expectedPrompt = `Use case: photorealistic-natural
Asset type: NAEIL synthetic dataset representative image
Primary request: Create a clean-room, photorealistic but unmistakably synthetic 16:9 object-only demonstration image for NAEIL. Field context: manufacturing; scenario: 소형 가공 부품 표면 상태 예시; task type: component-surface-inspection.
Scene/backdrop: generic unbranded indoor inspection workbench that cannot identify any real place
Subject: only synthetic machined metal components, with component surfaces and edges as the clear inspection area
Style/medium: polished realistic industrial photography, clearly staged as a synthetic demonstration
Composition/framing: wide 16:9 landscape, sharp complete inspection area, no cropping of primary parts
Lighting/mood: even neutral inspection lighting, safe and orderly
Constraints: baseline accepted-quality frame; no visible safety risk; synthetic candidate for independent human review, not approved data; no people, faces, hands, body parts, logos, branding, readable text, letters, numbers, store names, contact details, addresses, maps, coordinates, private location clues, license plates, identity documents, recognizable real premises, watermarks, or signatures; do not depict actual youth work or a real partner site
Avoid: clutter, blur, occlusion, duplicate objects that confuse inspection, out-of-scope background`;
const expectedPromptId = 'imgprompt-mfg-001-component-surface-baseline-accepted';
const expectedAssetId = 'asset-mfg-001-component-surface-baseline-accepted';
const expectedFilePath = 'public/assets/generated/syn-mfg-001-component-surface-baseline-accepted.png';
const expectedSecondPrompt = `Use case: photorealistic-natural
Asset type: NAEIL synthetic dataset representative image
Primary request: Create a clean-room, photorealistic but unmistakably synthetic 16:9 object-only demonstration image for NAEIL. Field context: manufacturing; scenario: 체결부품 트레이 배열 예시; task type: fastener-tray-arrangement.
Scene/backdrop: generic unbranded indoor inspection workbench that cannot identify any real place
Subject: only a synthetic modular tray of generic bolts, nuts, washers, and fasteners, with tray compartments and orderly part arrangement as the clear inspection area
Style/medium: polished realistic industrial photography, clearly staged as a synthetic demonstration
Composition/framing: wide 16:9 landscape, top-down three-quarter view, sharp complete tray, every primary compartment visible
Lighting/mood: even neutral inspection lighting, safe and orderly
Constraints: baseline accepted-quality frame; no visible safety risk; synthetic candidate for independent human review, not approved data; no people, faces, hands, body parts, logos, branding, readable text, letters, numbers, store names, contact details, addresses, maps, coordinates, private location clues, license plates, identity documents, recognizable real premises, watermarks, or signatures; do not depict actual youth work or a real partner site
Avoid: clutter, blur, occlusion, missing tray edges, mixed unrelated objects, out-of-scope background`;
const expectedThirdPrompt = `Use case: photorealistic-natural
Asset type: NAEIL synthetic dataset representative image
Primary request: Create a clean-room, photorealistic but unmistakably synthetic 16:9 object-only demonstration image for NAEIL. Field context: manufacturing; scenario: 안전구역 바닥 표시 예시; task type: safety-zone-marking-check.
Scene/backdrop: generic unbranded indoor industrial aisle that cannot identify any real place
Subject: only synthetic floor safety-zone markings, aisle boundaries, and a clear empty walkway, with the boundary geometry as the inspection area
Style/medium: polished realistic industrial photography, clearly staged as a synthetic demonstration
Composition/framing: wide 16:9 landscape, low three-quarter perspective, full path and boundary markings visible without cropping
Lighting/mood: even neutral indoor lighting, clean and safe
Constraints: baseline accepted-quality frame; no visible hazard or obstruction; synthetic candidate for independent human review, not approved data; no people, faces, hands, body parts, logos, branding, readable text, letters, numbers, store names, contact details, addresses, maps, coordinates, private location clues, license plates, identity documents, recognizable real premises, watermarks, or signatures; do not depict actual youth work or a real partner site
Avoid: emergency signage with text, arrows containing labels, clutter, blur, occlusion, blocked walkway, real company colors or branding`;
const expectedFourthPrompt = `Use case: photorealistic-natural
Asset type: NAEIL synthetic dataset representative image
Primary request: Create a clean-room, photorealistic but unmistakably synthetic 16:9 object-only demonstration image for NAEIL. Field context: small-business; scenario: 청과물 계량 작업 예시; task type: produce-weighing-check.
Scene/backdrop: generic unbranded indoor produce work counter that cannot identify any real place
Subject: only synthetic apples and citrus arranged around a plain digital scale, with the weighing plate and neutral display state as the clear inspection area
Style/medium: polished realistic small-business photography, clearly staged as a synthetic demonstration
Composition/framing: wide 16:9 landscape, three-quarter tabletop view, full scale and produce groups visible without cropping
Lighting/mood: soft even daylight-balanced lighting, clean and orderly
Constraints: baseline accepted-quality frame; display may be blank or abstract non-readable segments only; no visible safety risk; synthetic candidate for independent human review, not approved data; no people, faces, hands, body parts, logos, branding, readable text, letters, numbers, price labels, store names, contact details, addresses, maps, coordinates, private location clues, recognizable real premises, watermarks, or signatures; do not depict actual youth work or a real partner site
Avoid: real branded packaging, price signage, clutter, blur, occlusion, spoiled produce, identifiable storefronts`;
const expectedFifthPrompt = `Use case: photorealistic-natural
Asset type: NAEIL synthetic dataset representative image
Primary request: Create a clean-room, photorealistic but unmistakably synthetic 16:9 object-only demonstration image for NAEIL. Field context: small-business; scenario: 꽃집 포장 단계 예시; task type: florist-wrapping-stage-check.
Scene/backdrop: generic unbranded indoor florist worktable that cannot identify any real place
Subject: only a synthetic bouquet in progress, neutral wrapping paper, ribbon, and safe blunt floral tools arranged to show folding and tying stages
Style/medium: polished realistic small-business photography, clearly staged as a synthetic demonstration
Composition/framing: wide 16:9 landscape, three-quarter tabletop view, full bouquet and wrapping folds visible without cropping
Lighting/mood: soft even daylight-balanced lighting, clean and orderly
Constraints: baseline accepted-quality frame; no visible safety risk; synthetic candidate for independent human review, not approved data; no people, faces, hands, body parts, logos, branding, readable text, letters, numbers, price labels, store names, contact details, addresses, private location clues, recognizable real premises, watermarks, or signatures; do not depict actual youth work or a real partner site
Avoid: branded paper, printed ribbons, greeting cards with text, clutter, blur, occlusion, identifiable storefronts`;
const expectedSixthPrompt = `Use case: photorealistic-natural
Asset type: NAEIL synthetic dataset representative image
Primary request: Create a clean-room, photorealistic but unmistakably synthetic 16:9 object-only demonstration image for NAEIL. Field context: small-business; scenario: 주방 재료통 분류 예시; task type: ingredient-bin-sorting.
Scene/backdrop: generic unbranded commercial kitchen prep shelf that cannot identify any real place
Subject: only transparent and stainless ingredient bins containing visually distinct dry ingredients, arranged in a clean grid with color-coded blank geometric markers and no words
Style/medium: polished realistic small-business photography, clearly staged as a synthetic demonstration
Composition/framing: wide 16:9 landscape, frontal three-quarter view, all primary bins and their arrangement fully visible
Lighting/mood: even neutral food-prep lighting, clean and orderly
Constraints: baseline accepted-quality frame; all containers closed or safely covered; no visible safety risk; synthetic candidate for independent human review, not approved data; no people, faces, hands, body parts, logos, branding, readable text, letters, numbers, labels, store names, contact details, addresses, private location clues, recognizable real premises, watermarks, or signatures; do not depict actual youth work or a real partner site
Avoid: handwritten labels, branded packaging, allergen claims, spoiled ingredients, clutter, blur, occlusion, identifiable restaurant interiors`;
const expectedSeventhPrompt = 'Create a clean-room, photorealistic but unmistakably synthetic 16:9 object-only demonstration image for NAEIL. Field context: manufacturing; scenario: 부품 포장 상태 확인 예시; task type: component-packaging-check. Show only 합성 부품 포장, with 밀봉부와 완충재 배치 as the clear inspection area, in a generic unbranded interior that cannot identify any real place. Render a sharp, evenly lit, complete, unique, in-scope baseline frame with no visible safety risk; it remains a synthetic candidate for independent human review, not approved data. No people, faces, hands, logos, readable text, private location clues, or recognizable real business exterior. Do not depict actual youth work or a real partner site.';
const expectedEighthPrompt = 'Create a clean-room, photorealistic but unmistakably synthetic 16:9 object-only demonstration image for NAEIL. Field context: manufacturing; scenario: 부품 보관함 라벨 정합 예시; task type: parts-bin-label-verification. Show only 합성 부품 보관함, with 보관함 위치와 비식별 범주 라벨 as the clear inspection area, in a generic unbranded interior that cannot identify any real place. Render a sharp, evenly lit, complete, unique, in-scope baseline frame with no visible safety risk; it remains a synthetic candidate for independent human review, not approved data. No people, faces, hands, logos, readable text, private location clues, or recognizable real business exterior. Do not depict actual youth work or a real partner site.';
const expectedCompletions = [
  {
    assetId: expectedAssetId,
    promptId: expectedPromptId,
    filePath: expectedFilePath,
    generatorOutputId: 'exec-2653c066-dc75-4163-8119-26ea186c70b8.png',
    exactPrompt: expectedPrompt,
    promptSha256: 'fbb1fdaf96a455bb7e8c8b78dcc69a8e3055fe8dc57b3ea722cabdd16f2dfce3',
    fileSha256: 'd05625cad53b626bbd87b48eb06ce377ca92de92424b63de2592868d6da2a562',
    byteLength: 1792417,
  },
  {
    assetId: 'asset-mfg-002-fastener-tray-baseline-accepted',
    promptId: 'imgprompt-mfg-002-fastener-tray-baseline-accepted',
    filePath: 'public/assets/generated/syn-mfg-002-fastener-tray-baseline-accepted.png',
    generatorOutputId: 'exec-6a006a34-ef4e-4792-948f-5f762304e5fc.png',
    exactPrompt: expectedSecondPrompt,
    promptSha256: 'a3b7a0495ab8fb0f5f171046e952a253c0dd9d4e3b2730ed78db60cea492528a',
    fileSha256: '583e1bf0d3a5493d70831947c18f6c98e02c464a7d23e7021c9524aefd9a43a9',
    byteLength: 2340409,
  },
  {
    assetId: 'asset-mfg-003-safety-zone-baseline-accepted',
    promptId: 'imgprompt-mfg-003-safety-zone-baseline-accepted',
    filePath: 'public/assets/generated/syn-mfg-003-safety-zone-baseline-accepted.png',
    generatorOutputId: 'exec-e0cf027b-90c3-461b-a5bf-1e74f4df0ce1.png',
    exactPrompt: expectedThirdPrompt,
    promptSha256: '484b18822d089f8e3fc4c7395b8615f356d96cb413129abbc81ac07ffac6bce2',
    fileSha256: '0b76fd9f8410f59296b315e2e7fd3b931029b7decf5658da675ef092e28be225',
    byteLength: 1904266,
  },
  {
    assetId: 'asset-smb-003-produce-weighing-baseline-accepted',
    promptId: 'imgprompt-smb-003-produce-weighing-baseline-accepted',
    filePath: 'public/assets/generated/syn-smb-003-produce-weighing-baseline-accepted.png',
    generatorOutputId: 'exec-dd5ebc61-72eb-492e-b2dd-fb9b6267aeec.png',
    exactPrompt: expectedFourthPrompt,
    promptSha256: '1a2afa81abee36a3c7303aafc76ed58e15fa79c173fb547f000a2a0d6ed18f32',
    fileSha256: '6e34ec21ba506e2bc2d0d2e249c76277e763563dc6f38ce2d571c1cbf1c70168',
    byteLength: 2012846,
  },
  {
    assetId: 'asset-smb-004-florist-wrapping-baseline-accepted',
    promptId: 'imgprompt-smb-004-florist-wrapping-baseline-accepted',
    filePath: 'public/assets/generated/syn-smb-004-florist-wrapping-baseline-accepted.png',
    generatorOutputId: 'exec-c91b04ca-59f4-4ee3-adc3-9a173e27fcdb.png',
    exactPrompt: expectedFifthPrompt,
    promptSha256: 'c486c0c21633faa407f441b90dd8b86a011fa440fdc1a4d9d1ecacfcb2b1ef9d',
    fileSha256: '553871d54ec3d44e3968c2ec6816555dacd44836ead159a321a5c69a43c65f1a',
    byteLength: 2267940,
  },
  {
    assetId: 'asset-smb-006-ingredient-bin-baseline-accepted',
    promptId: 'imgprompt-smb-006-ingredient-bin-baseline-accepted',
    filePath: 'public/assets/generated/syn-smb-006-ingredient-bin-baseline-accepted.png',
    generatorOutputId: 'exec-066c7c42-1471-4426-a29d-6c50059def4a.png',
    exactPrompt: expectedSixthPrompt,
    promptSha256: '64642e5f354547b7936ddd29fe08933fcc27a3b5915d049598ba82e21db41be8',
    fileSha256: '0f7bb7cddc0c497042d861d9e714f291795e967b9608c2db5a6dfe0bcbd2d844',
    byteLength: 2751818,
  },
  {
    assetId: 'asset-mfg-004-packaging-check-baseline-accepted',
    promptId: 'imgprompt-mfg-004-packaging-check-baseline-accepted',
    filePath: 'public/assets/generated/syn-mfg-004-packaging-check-baseline-accepted.png',
    generatorOutputId: 'exec-ff3f473b-4aca-42c8-983f-54fc7eb03615.png',
    exactPrompt: expectedSeventhPrompt,
    promptSha256: 'f6743023b5add6a47c9c9e18d26edd1b86918d4787ac37ca3b06b82c457963fe',
    fileSha256: 'd832d0e5f779921436021a814cfc556c5bcb2d3378749339a7031ae162373b44',
    byteLength: 2547600,
  },
  {
    assetId: 'asset-mfg-005-bin-label-baseline-accepted',
    promptId: 'imgprompt-mfg-005-bin-label-baseline-accepted',
    filePath: 'public/assets/generated/syn-mfg-005-bin-label-baseline-accepted.png',
    generatorOutputId: 'exec-c52fe9c6-c5c4-49a2-905e-dbc8081e917a.png',
    exactPrompt: expectedEighthPrompt,
    promptSha256: '4e62144865e40f31575b378f25a6b3e24fab6d1e11583358cc1bfbe27d2ad538',
    fileSha256: '9796442ed142f32f3ddaaf760ddce80758433c07838e953c0288146d4c5e6f51',
    byteLength: 1909981,
  },
];

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function readJson(relativePath) {
  const raw = await readFile(new URL(relativePath, root), 'utf8');
  const parsed = JSON.parse(raw);
  assert.equal(raw, `${JSON.stringify(parsed, null, 2)}\n`);
  return { raw, parsed };
}

test('completion ledger records exact prompt, generator identity, file integrity, and human review', async () => {
  const { parsed: ledger } = await readJson('public/data/image-generation-completions.json');
  assert.equal(ledger.completionCount, 8);
  assert.equal(ledger.completions.length, 8);
  for (const expected of expectedCompletions) {
    const completion = ledger.completions.find(({ promptId }) => promptId === expected.promptId);
    assert.ok(completion);
    assert.equal(completion.assetId, expected.assetId);
    assert.equal(completion.filePath, expected.filePath);
    assert.equal(completion.tool, 'OpenAI image_gen');
    assert.equal(completion.sourceType, 'AI-generated synthetic example');
    assert.equal(completion.generatorSessionId, '01a0bc13-8c69-74b2-8077-24eaef0f603e');
    assert.equal(completion.generatorOutputId, expected.generatorOutputId);
    assert.equal(completion.exactPrompt, expected.exactPrompt);
    assert.equal(completion.promptSha256, expected.promptSha256);
    assert.equal(completion.promptSha256, sha256(Buffer.from(expected.exactPrompt, 'utf8')));
    assert.deepEqual(completion.file, {
      sha256: expected.fileSha256,
      byteLength: expected.byteLength,
      pixelWidth: 1672,
      pixelHeight: 941,
    });
    assert.equal(completion.humanReview.status, 'passed-for-prototype-illustration');
    assert.equal(completion.humanReview.decisionAuthority, 'human');
    assert.ok(Object.values(completion.humanReview.checklist).every((value) => value === true));
    assert.equal(completion.rights.status, 'project-use-granted');
    assert.ok(completion.rights.permittedUses.every((use) => /prototype|competition-submission/.test(use)));
    assert.ok(completion.rights.prohibitedUses.some((use) => /approved model-training data/.test(use)));
    assert.deepEqual(completion.syntheticBoundary, {
      notFieldCollection: true,
      notYouthWork: true,
      notPartnerData: true,
      notApprovedTrainingData: true,
    });
    assert.equal(completion.status, 'generated-human-reviewed-for-prototype-use');
    assert.match(completion.usageBoundary, /승인 학습 데이터가 아님/);
  }
  const florist = ledger.completions.find(({ promptId }) => promptId === 'imgprompt-smb-004-florist-wrapping-baseline-accepted');
  assert.equal(florist.humanReview.checklist.stationaryBluntFloralToolsOnly, true);
  assert.match(florist.usageBoundary, /안전 인증.*아님/);
});

test('recorded PNG bytes and dimensions exactly match the completion ledger', async () => {
  const { parsed: ledger } = await readJson('public/data/image-generation-completions.json');
  for (const completion of ledger.completions) {
    const bytes = await readFile(new URL(`../${completion.filePath}`, import.meta.url));
    assert.equal(bytes.length, completion.file.byteLength);
    assert.equal(sha256(bytes), completion.file.sha256);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16), 1672);
    assert.equal(bytes.readUInt32BE(20), 941);
  }
});

test('only the eight ledger-linked queue items are generated and project-use granted', async () => {
  const { parsed: ledger } = await readJson('public/data/image-generation-completions.json');
  const { parsed: queue } = await readJson('public/data/image-generation-queue.json');
  const generated = queue.items.filter(({ generationStatus }) => generationStatus === 'generated-human-reviewed-for-prototype-use');
  const planned = queue.items.filter(({ generationStatus }) => generationStatus === 'planned-not-generated');
  assert.equal(generated.length, 8);
  assert.equal(planned.length, 28);
  assert.equal(queue.generatedItemCount, 8);
  assert.equal(queue.plannedItemCount, 28);
  assert.equal(queue.rightsApprovedItemCount, 8);
  for (const completion of ledger.completions) {
    const item = generated.find(({ promptId }) => promptId === completion.promptId);
    assert.ok(item);
    assert.equal(item.generatedAssetId, completion.assetId);
    assert.equal(item.filePath, completion.filePath);
    assert.equal(item.fullPrompt, completion.exactPrompt);
    assert.equal(item.provenanceCapture.promptSha256, completion.promptSha256);
    assert.equal(item.provenanceCapture.fileSha256, completion.file.sha256);
    assert.equal(item.provenanceCapture.byteLength, completion.file.byteLength);
    assert.deepEqual(item.provenanceCapture.dimensions, { pixelWidth: 1672, pixelHeight: 941 });
    assert.equal(item.rightsStatus, 'project-use-granted');
    assert.equal(item.rights.status, 'project-use-granted');
  }
  assert.ok(planned.every((entry) => entry.rightsStatus === 'pending-generation'));
  assert.ok(planned.every((entry) => entry.provenanceCapture.generatorOutputId === null));
  assert.ok(planned.every((entry) => entry.provenanceCapture.fileSha256 === null));
});

test('manifest preserves three partial assets and adds eight complete ledger-linked assets', async () => {
  const { parsed: manifest } = await readJson('public/assets/asset-manifest.json');
  assert.equal(manifest.assets.length, 11);
  assert.deepEqual(manifest.assets.slice(0, 3).map(({ id }) => id), [
    'asset-mfg-001-inspection',
    'asset-smb-001-bakery-rack',
    'asset-smb-002-cup-sorting',
  ]);
  assert.ok(manifest.assets.slice(0, 3).every(({ provenanceCompleteness }) => provenanceCompleteness === 'partial-full-prompt-not-recorded'));
  for (const expected of expectedCompletions) {
    const asset = manifest.assets.find(({ id }) => id === expected.assetId);
    assert.ok(asset);
    assert.equal(asset.promptId, expected.promptId);
    assert.equal(asset.filePath, expected.filePath);
    assert.equal(asset.provenanceCompleteness, 'complete-exact-prompt-generator-file-and-human-review');
    assert.equal(asset.prompt.sha256, expected.promptSha256);
    assert.equal(asset.file.sha256, expected.fileSha256);
    assert.equal(asset.rights.status, 'project-use-granted');
    assert.deepEqual(asset.syntheticBoundary, {
      notFieldCollection: true,
      notYouthWork: true,
      notPartnerData: true,
      notApprovedTrainingData: true,
    });
  }
});

test('completion-derived artifacts are byte-stable and retain truthful coverage', async () => {
  const first = await buildSyntheticArtifacts({ seed: DEFAULT_SEED });
  const second = await buildSyntheticArtifacts({ seed: DEFAULT_SEED });
  assert.equal(first.serialized.imageGenerationQueue, second.serialized.imageGenerationQueue);
  assert.equal(first.serialized.assetManifest, second.serialized.assetManifest);
  assert.equal(first.serialized.datasetCoverage, second.serialized.datasetCoverage);
  assert.equal(first.serialized.datasetIndex, second.serialized.datasetIndex);
  assert.equal(first.datasetCoverage.plannedImageCoverage.plannedNotGeneratedCount, 28);
  assert.equal(first.datasetCoverage.plannedImageCoverage.generatedQueueOutputCount, 8);
  assert.equal(first.datasetCoverage.plannedImageCoverage.totalManifestAssetCount, 11);
  assert.equal(first.datasetIndex.artifactCount, 14);
});

test('public build copies the completion ledger and PNG without changing bytes', async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'naeil-completion-build-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));
  const distDir = path.join(tempRoot, 'dist');
  await buildPublic({
    publicDir: path.join(projectRoot, 'public'),
    distDir,
    writeLatestReport: false,
  });
  for (const relativePath of [
    'data/image-generation-completions.json',
    'assets/generated/syn-mfg-001-component-surface-baseline-accepted.png',
    'assets/generated/syn-mfg-002-fastener-tray-baseline-accepted.png',
    'assets/generated/syn-mfg-003-safety-zone-baseline-accepted.png',
    'assets/generated/syn-smb-003-produce-weighing-baseline-accepted.png',
    'assets/generated/syn-smb-004-florist-wrapping-baseline-accepted.png',
    'assets/generated/syn-smb-006-ingredient-bin-baseline-accepted.png',
    'assets/generated/syn-mfg-004-packaging-check-baseline-accepted.png',
    'assets/generated/syn-mfg-005-bin-label-baseline-accepted.png',
  ]) {
    const source = await readFile(path.join(projectRoot, 'public', relativePath));
    const built = await readFile(path.join(distDir, relativePath));
    assert.deepEqual(built, source);
  }
});
