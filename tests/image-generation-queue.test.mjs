import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildImageGenerationArtifacts,
  buildSyntheticArtifacts,
  DEFAULT_SEED,
} from '../scripts/generate-synthetic-dataset.mjs';

const root = new URL('../', import.meta.url);

const existingAssetIntegrity = Object.freeze({
  'public/assets/asset-manifest.json': ['4bcf7ecf0e30f0d9bcb15d9fb96c5c7eee767f485cefac9e06da284b423dd73a', 34431],
  'public/assets/manufacturing-inspection-synthetic.png': ['64c02e96ad11d15a5b7fd7227fc9ed30a9fa4cc809d8b23a75910de43a956483', 1911892],
  'public/assets/bakery-rack-synthetic.png': ['9395a6a78b4a91e0a317ea7422d858264bc9d2d06958962cc5c42bf8fbbe2141', 2235224],
  'public/assets/cafe-cup-sorting-synthetic.png': ['35e0a59000e83e9a4fdc4a2c2324c0d6532ed20757c93a06ae53bfc0bec03cc3', 2211416],
  'public/assets/generated/syn-mfg-001-component-surface-baseline-accepted.png': ['d05625cad53b626bbd87b48eb06ce377ca92de92424b63de2592868d6da2a562', 1792417],
  'public/assets/generated/syn-mfg-002-fastener-tray-baseline-accepted.png': ['583e1bf0d3a5493d70831947c18f6c98e02c464a7d23e7021c9524aefd9a43a9', 2340409],
  'public/assets/generated/syn-mfg-003-safety-zone-baseline-accepted.png': ['0b76fd9f8410f59296b315e2e7fd3b931029b7decf5658da675ef092e28be225', 1904266],
  'public/assets/generated/syn-smb-003-produce-weighing-baseline-accepted.png': ['6e34ec21ba506e2bc2d0d2e249c76277e763563dc6f38ce2d571c1cbf1c70168', 2012846],
  'public/assets/generated/syn-smb-004-florist-wrapping-baseline-accepted.png': ['553871d54ec3d44e3968c2ec6816555dacd44836ead159a321a5c69a43c65f1a', 2267940],
  'public/assets/generated/syn-smb-006-ingredient-bin-baseline-accepted.png': ['0f7bb7cddc0c497042d861d9e714f291795e967b9608c2db5a6dfe0bcbd2d844', 2751818],
  'public/assets/generated/syn-mfg-004-packaging-check-baseline-accepted.png': ['d832d0e5f779921436021a814cfc556c5bcb2d3378749339a7031ae162373b44', 2547600],
  'public/assets/generated/syn-mfg-005-bin-label-baseline-accepted.png': ['9796442ed142f32f3ddaaf760ddce80758433c07838e953c0288146d4c5e6f51', 1909981],
});

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function readDeterministicJson(relativePath) {
  const raw = await readFile(new URL(relativePath, root), 'utf8');
  const parsed = JSON.parse(raw);
  assert.equal(raw, `${JSON.stringify(parsed, null, 2)}\n`, `${relativePath} must use deterministic two-space JSON`);
  return { raw, parsed };
}

async function canonicalInputs() {
  const [catalog, taxonomy, observations, recollectionTasks, assetManifest, completionLedger] = await Promise.all([
    readDeterministicJson('public/data/catalog.json'),
    readDeterministicJson('public/data/quality-taxonomy.json'),
    readDeterministicJson('public/data/synthetic-observations.json'),
    readDeterministicJson('public/data/recollection-tasks.json'),
    readDeterministicJson('public/assets/asset-manifest.json'),
    readDeterministicJson('public/data/image-generation-completions.json'),
  ]);
  return {
    catalog: catalog.parsed,
    taxonomy: taxonomy.parsed,
    observations: observations.parsed,
    recollectionTasks: recollectionTasks.parsed,
    assetManifest: assetManifest.parsed,
    completionLedger: completionLedger.parsed,
  };
}

test('image queue and rights policy regenerate byte-for-byte from canonical inputs', async () => {
  const inputs = await canonicalInputs();
  const first = buildImageGenerationArtifacts({ seed: DEFAULT_SEED, ...inputs });
  const second = buildImageGenerationArtifacts({ seed: DEFAULT_SEED, ...inputs });
  assert.deepEqual(first.serialized, second.serialized);

  const queue = await readDeterministicJson('public/data/image-generation-queue.json');
  const policy = await readDeterministicJson('public/data/image-rights-policy.json');
  assert.equal(queue.raw, first.serialized.imageGenerationQueue);
  assert.equal(policy.raw, first.serialized.imageRightsPolicy);

  const complete = await buildSyntheticArtifacts({ seed: DEFAULT_SEED });
  assert.equal(complete.serialized.imageGenerationQueue, queue.raw);
  assert.equal(complete.serialized.imageRightsPolicy, policy.raw);

  const alternate = buildImageGenerationArtifacts({ seed: 'naeil-image-queue-alt-check', ...inputs });
  assert.notEqual(alternate.serialized.imageGenerationQueue, queue.raw);
  assert.deepEqual(
    alternate.imageGenerationQueue.items.map(({ promptId }) => promptId),
    first.imageGenerationQueue.items.map(({ promptId }) => promptId),
    'stable prompt IDs must not depend on seed',
  );
  assert.deepEqual(
    alternate.imageGenerationQueue.items.map(({ fullPrompt }) => fullPrompt),
    first.imageGenerationQueue.items.map(({ fullPrompt }) => fullPrompt),
    'prompt bytes must remain stable across metadata seed changes',
  );
});

test('queue contains three variations per scenario with eight completed prototype assets', async () => {
  const { parsed: catalog } = await readDeterministicJson('public/data/catalog.json');
  const { parsed: queue } = await readDeterministicJson('public/data/image-generation-queue.json');
  const scenarioById = new Map(catalog.syntheticExamples.map((scenario) => [scenario.id, scenario]));
  const expectedVariations = new Set(['baseline-accepted', 'visible-issue', 'corrected-recollection']);

  assert.equal(queue.scenarioCount, 12);
  assert.equal(queue.variationsPerScenario, 3);
  assert.equal(queue.itemCount, 36);
  assert.equal(queue.items.length, 36);
  assert.equal(queue.plannedItemCount, 28);
  assert.equal(queue.generatedItemCount, 8);
  assert.equal(queue.rightsApprovedItemCount, 8);
  assert.equal(new Set(queue.items.map(({ promptId }) => promptId)).size, 36);
  assert.equal(new Set(queue.items.map(({ intendedFilename }) => intendedFilename)).size, 36);
  assert.deepEqual(new Set(queue.items.map(({ scenarioId }) => scenarioId)), new Set(scenarioById.keys()));
  assert.deepEqual(new Set(queue.items.map(({ field }) => field)), new Set(['manufacturing', 'small-business']));

  for (const scenario of scenarioById.values()) {
    const items = queue.items.filter(({ scenarioId }) => scenarioId === scenario.id);
    assert.equal(items.length, 3);
    assert.deepEqual(new Set(items.map(({ variationType }) => variationType)), expectedVariations);
    assert.ok(items.every(({ field }) => field === scenario.field));
  }
});

test('queue references canonical taxonomy, observations, and recollection tasks', async () => {
  const inputs = await canonicalInputs();
  const { parsed: queue } = await readDeterministicJson('public/data/image-generation-queue.json');
  const taxonomyCodes = new Set(inputs.taxonomy.issueCodes.map(({ code }) => code));
  const observationsById = new Map(inputs.observations.records.map((record) => [record.id, record]));
  const tasksById = new Map(inputs.recollectionTasks.tasks.map((task) => [task.taskId, task]));

  for (const item of queue.items) {
    assert.ok(item.linkedIssueCodes.length >= 1);
    assert.ok(item.linkedIssueCodes.every((code) => taxonomyCodes.has(code)));
    assert.ok(item.linkedObservationIds.length >= 1);
    for (const observationId of item.linkedObservationIds) {
      const observation = observationsById.get(observationId);
      assert.ok(observation, `${item.promptId} references an unknown observation`);
      assert.equal(observation.scenarioId, item.scenarioId);
      assert.equal(observation.field, item.field);
      assert.deepEqual(observation.issueCodes, item.linkedIssueCodes);
    }
    if (item.variationType === 'baseline-accepted') {
      assert.deepEqual(item.linkedIssueCodes, ['normal']);
      assert.deepEqual(item.linkedRecollectionTaskIds, []);
    } else {
      assert.doesNotMatch(item.linkedIssueCodes.join(','), /^normal$/);
    }
    if (item.variationType === 'corrected-recollection') {
      assert.equal(item.linkedRecollectionTaskIds.length, 1);
      const task = tasksById.get(item.linkedRecollectionTaskIds[0]);
      assert.ok(task);
      assert.ok(item.linkedObservationIds.includes(task.sourceObservationId));
      assert.deepEqual(task.scopedIssueCodes, item.linkedIssueCodes);
    } else {
      assert.deepEqual(item.linkedRecollectionTaskIds, []);
    }
  }
});

test('queue keeps 28 items pending and derives only the eight ledger items as human-reviewed', async () => {
  const { raw, parsed: queue } = await readDeterministicJson('public/data/image-generation-queue.json');
  for (const item of queue.items) {
    assert.equal(item.targetAspectRatio, '16:9');
    assert.ok(item.targetUse);
    assert.ok(item.fullPrompt.trim());
    assert.ok(item.negativePrompt.trim());
    assert.equal(item.sourceType, 'AI-generated synthetic example');
    assert.ok(item.permittedUses.length >= 1);
    assert.ok(item.prohibitedUses.length >= 4);
    assert.equal(item.containsNoPersonalData, true);
    assert.equal(item.containsNoPrivateSiteDetails, true);
    assert.equal(item.noFaces, true);
    assert.equal(item.noLogos, true);
    assert.equal(item.noReadableText, true);
    assert.match(item.negativePrompt, /people/i);
    assert.match(item.negativePrompt, /faces/i);
    assert.match(item.negativePrompt, /readable text/i);
    assert.match(item.negativePrompt, /logos/i);
    assert.match(item.negativePrompt, /private location/i);
    assert.match(item.negativePrompt, /real business exterior/i);
    assert.equal(item.provenanceCapture.promptHashAlgorithm, 'sha256-utf8-fullPrompt-exact-bytes');
    assert.equal(item.provenanceCapture.promptSha256, sha256(Buffer.from(item.fullPrompt, 'utf8')));
    assert.equal(item.reviewerChecklist.length, 6);
    assert.ok(item.reviewerChecklist.every(({ required }) => required === true));
    assert.equal(item.rights.thirdPartyMediaUsed, false);
    assert.equal(item.rights.codeLicenseApplies, false);
    assert.match(item.usageBoundary, /승인 학습 데이터가 아님/);
    if (item.generationStatus === 'planned-not-generated') {
      assert.equal(item.rightsStatus, 'pending-generation');
      assert.equal(item.provenanceCapture.generatorTool, null);
      assert.equal(item.provenanceCapture.generatorSessionId, null);
      assert.equal(item.provenanceCapture.generatorOutputId, null);
      assert.equal(item.provenanceCapture.fileSha256, null);
      assert.equal(item.provenanceCapture.byteLength, null);
      assert.equal(item.provenanceCapture.dimensions, null);
      assert.equal(item.provenanceCapture.captureStatus, 'awaiting-generation');
      assert.equal(item.reviewExpectation, 'independent-human-review-required-after-generation');
      assert.equal(item.rights.status, 'pending-generation');
      assert.match(item.usageBoundary, /아직 생성되지 않은/);
    } else {
      assert.equal(item.generationStatus, 'generated-human-reviewed-for-prototype-use');
      assert.equal(item.rightsStatus, 'project-use-granted');
      assert.equal(item.provenanceCapture.captureStatus, 'complete-human-reviewed-prototype-use');
      assert.equal(item.reviewExpectation, 'human-review-completed-for-prototype-use');
      assert.equal(item.rights.status, 'project-use-granted');
    }
  }

  assert.doesNotMatch(raw, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  assert.doesNotMatch(raw, /(?<!\d)01[016789][-\.\s]?\d{3,4}[-\.\s]?\d{4}(?!\d)/);
  assert.doesNotMatch(raw, /\bsk-[A-Za-z0-9_-]{20,}\b/);
});

test('rights policy structures provenance, review, synthetic boundary, and remediation', async () => {
  const { parsed: policy } = await readDeterministicJson('public/data/image-rights-policy.json');
  assert.equal(policy.policyItemCount, 8);
  assert.equal(policy.policyItems.length, 8);
  assert.equal(new Set(policy.policyItems.map(({ policyItemId }) => policyItemId)).size, 8);
  assert.deepEqual(new Set(policy.policyItems.map(({ phase }) => phase)), new Set([
    'pre-generation',
    'post-generation',
    'publication',
    'remediation',
  ]));
  assert.match(policy.provenanceCaptureContract.promptHashRule, /SHA-256/);
  assert.match(policy.provenanceCaptureContract.fileHashRule, /generated file bytes/);
  for (const field of ['generatorOutputId', 'fileSha256', 'byteLength', 'pixelWidth', 'pixelHeight']) {
    assert.ok(policy.provenanceCaptureContract.postGenerationRequired.includes(field));
  }
  assert.equal(policy.preGenerationReview.requiredStatus, 'planned-not-generated');
  assert.equal(policy.preGenerationReview.requiredRightsStatus, 'pending-generation');
  assert.equal(policy.postGenerationReview.decisionAuthority, 'independent-human-reviewer');
  assert.equal(policy.postGenerationReview.generatorMaySelfApprove, false);
  assert.equal(policy.postGenerationReview.collectorMaySelfApprove, false);
  assert.deepEqual(policy.syntheticBoundary, {
    notFieldCollection: true,
    notYouthWork: true,
    notPartnerData: true,
    notApprovedTrainingData: true,
    notRealBusinessEvidence: true,
  });
  assert.equal(policy.existingAssetHandling.existingAssetCount, 11);
  assert.equal(policy.existingAssetHandling.partialProvenanceAssetCount, 3);
  assert.equal(policy.existingAssetHandling.completeProvenanceAssetCount, 8);
  assert.equal(policy.existingAssetHandling.manifestRemainsCanonical, true);
  assert.equal(policy.existingAssetHandling.queueGeneratorMayModifyManifest, false);
  assert.equal(policy.existingAssetHandling.queueGeneratorMayBackfillMissingPrompt, false);
  assert.equal(policy.existingAssetHandling.provenanceStatus, 'preserve-three-partial-records-and-8-ledger-complete-records-honestly');
  assert.ok(policy.removalReplacementProcedure.triggers.length >= 6);
  assert.ok(policy.removalReplacementProcedure.steps.length >= 5);
});

test('the generator preserves three partial assets and registers eight complete ledger assets', async () => {
  for (const [relativePath, [expectedHash, expectedBytes]] of Object.entries(existingAssetIntegrity)) {
    const bytes = await readFile(new URL(relativePath, root));
    assert.equal(bytes.length, expectedBytes, `${relativePath} byte length changed`);
    assert.equal(sha256(bytes), expectedHash, `${relativePath} hash changed`);
  }

  const { parsed: manifest } = await readDeterministicJson('public/assets/asset-manifest.json');
  assert.equal(manifest.assets.length, 11);
  for (const asset of manifest.assets.slice(0, 3)) {
    assert.equal(asset.sourceType, 'AI-generated synthetic example');
    assert.equal(asset.provenanceCompleteness, 'partial-full-prompt-not-recorded');
    assert.equal(asset.prompt.status, 'not-recorded');
    assert.equal(asset.prompt.sha256, null);
    assert.ok(asset.generation.generatorOutputId);
    assert.ok(asset.file.sha256);
    assert.ok(asset.file.byteLength > 0);
    assert.ok(asset.file.pixelWidth > 0);
    assert.ok(asset.file.pixelHeight > 0);
  }
  const expectedCompleted = new Map([
    ['asset-mfg-001-component-surface-baseline-accepted', 'fbb1fdaf96a455bb7e8c8b78dcc69a8e3055fe8dc57b3ea722cabdd16f2dfce3'],
    ['asset-mfg-002-fastener-tray-baseline-accepted', 'a3b7a0495ab8fb0f5f171046e952a253c0dd9d4e3b2730ed78db60cea492528a'],
    ['asset-mfg-003-safety-zone-baseline-accepted', '484b18822d089f8e3fc4c7395b8615f356d96cb413129abbc81ac07ffac6bce2'],
    ['asset-smb-003-produce-weighing-baseline-accepted', '1a2afa81abee36a3c7303aafc76ed58e15fa79c173fb547f000a2a0d6ed18f32'],
    ['asset-smb-004-florist-wrapping-baseline-accepted', 'c486c0c21633faa407f441b90dd8b86a011fa440fdc1a4d9d1ecacfcb2b1ef9d'],
    ['asset-smb-006-ingredient-bin-baseline-accepted', '64642e5f354547b7936ddd29fe08933fcc27a3b5915d049598ba82e21db41be8'],
    ['asset-mfg-004-packaging-check-baseline-accepted', 'f6743023b5add6a47c9c9e18d26edd1b86918d4787ac37ca3b06b82c457963fe'],
    ['asset-mfg-005-bin-label-baseline-accepted', '4e62144865e40f31575b378f25a6b3e24fab6d1e11583358cc1bfbe27d2ad538'],
  ]);
  for (const completed of manifest.assets.slice(3)) {
    assert.equal(completed.provenanceCompleteness, 'complete-exact-prompt-generator-file-and-human-review');
    assert.equal(completed.prompt.status, 'recorded');
    assert.equal(completed.prompt.sha256, expectedCompleted.get(completed.id));
    assert.equal(completed.rights.status, 'project-use-granted');
    assert.ok(Object.values(completed.syntheticBoundary).every((value) => value === true));
  }
});
