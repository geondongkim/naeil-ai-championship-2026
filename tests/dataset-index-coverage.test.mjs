import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

import {
  buildDatasetDiscoveryArtifacts,
  buildSyntheticArtifacts,
  DEFAULT_SEED,
} from '../scripts/generate-synthetic-dataset.mjs';

const root = new URL('../', import.meta.url);

const sourceSpecs = Object.freeze({
  catalog: 'public/data/catalog.json',
  taxonomy: 'public/data/quality-taxonomy.json',
  observations: 'public/data/synthetic-observations.json',
  reviewEvents: 'public/data/review-events.json',
  recollectionTasks: 'public/data/recollection-tasks.json',
  evaluationCases: 'public/data/evaluation-cases.json',
  trainingCatalog: 'public/data/training-catalog.json',
  roleTaskMatrix: 'public/data/role-task-matrix.json',
  careerEvidence: 'public/data/career-evidence.json',
  imageGenerationCompletions: 'public/data/image-generation-completions.json',
  imageGenerationQueue: 'public/data/image-generation-queue.json',
  imageRightsPolicy: 'public/data/image-rights-policy.json',
});

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function readDeterministicJson(relativePath) {
  const raw = await readFile(new URL(relativePath, root), 'utf8');
  const parsed = JSON.parse(raw);
  assert.equal(raw, `${JSON.stringify(parsed, null, 2)}\n`, `${relativePath} must use deterministic two-space JSON`);
  return { raw, parsed };
}

async function canonicalInputs() {
  const pairs = await Promise.all(Object.entries(sourceSpecs).map(async ([key, relativePath]) => {
    const { raw, parsed } = await readDeterministicJson(relativePath);
    return [key, raw, parsed];
  }));
  const { parsed: assetManifest } = await readDeterministicJson('public/assets/asset-manifest.json');
  return {
    documents: Object.fromEntries(pairs.map(([key, , parsed]) => [key, parsed])),
    serialized: Object.fromEntries(pairs.map(([key, raw]) => [key, raw])),
    assetManifest,
  };
}

test('dataset index and coverage regenerate byte-for-byte from canonical artifacts', async () => {
  const inputs = await canonicalInputs();
  const first = buildDatasetDiscoveryArtifacts({ seed: DEFAULT_SEED, ...inputs });
  const second = buildDatasetDiscoveryArtifacts({ seed: DEFAULT_SEED, ...inputs });
  assert.deepEqual(first.serialized, second.serialized);

  const index = await readDeterministicJson('public/data/dataset-index.json');
  const coverage = await readDeterministicJson('public/data/dataset-coverage.json');
  assert.equal(index.raw, first.serialized.datasetIndex);
  assert.equal(coverage.raw, first.serialized.datasetCoverage);

  const complete = await buildSyntheticArtifacts({ seed: DEFAULT_SEED });
  assert.equal(complete.serialized.datasetIndex, index.raw);
  assert.equal(complete.serialized.datasetCoverage, coverage.raw);

  const alternate = buildDatasetDiscoveryArtifacts({ seed: 'naeil-dataset-index-alt-check', ...inputs });
  assert.notEqual(alternate.serialized.datasetIndex, index.raw);
  assert.deepEqual(
    alternate.datasetIndex.artifacts.map(({ artifactId }) => artifactId),
    first.datasetIndex.artifacts.map(({ artifactId }) => artifactId),
    'stable artifact IDs must not depend on metadata seed',
  );
});

test('index lists every public data artifact with exact source integrity', async () => {
  const { parsed: index } = await readDeterministicJson('public/data/dataset-index.json');
  const publicDataFiles = (await readdir(new URL('../public/data/', import.meta.url)))
    .filter((name) => name.endsWith('.json'))
    .map((name) => `public/data/${name}`)
    .sort();
  const indexedPaths = index.artifacts.map(({ filePath }) => filePath).sort();
  assert.deepEqual(indexedPaths, publicDataFiles);
  assert.equal(index.artifactCount, 14);
  assert.equal(index.artifacts.length, 14);
  assert.equal(new Set(index.artifacts.map(({ artifactId }) => artifactId)).size, 14);
  assert.equal(new Set(indexedPaths).size, 14);

  const requiredFields = [
    'id',
    'artifactId',
    'filePath',
    'schemaVersion',
    'recordType',
    'recordCount',
    'sourceType',
    'status',
    'rights',
    'usageBoundary',
    'relatedArtifactIds',
    'sha256',
    'byteLength',
    'version',
  ];
  for (const entry of index.artifacts) {
    assert.deepEqual(Object.keys(entry), requiredFields);
    assert.equal(entry.id, entry.artifactId);
    assert.equal(entry.schemaVersion, '1.0.0');
    assert.ok(entry.recordType);
    assert.ok(Number.isInteger(entry.recordCount));
    assert.ok(entry.sourceType);
    assert.ok(entry.status);
    assert.ok(entry.rights.status);
    assert.equal(entry.rights.thirdPartyMediaUsed, false);
    assert.equal(entry.rights.codeLicenseApplies, false);
    assert.ok(entry.usageBoundary);
    assert.equal(entry.version, '1.0.0');
    if (entry.artifactId === 'artifact-dataset-index') {
      assert.equal(entry.sha256, 'unavailable-self-reference');
      assert.equal(entry.byteLength, null);
      continue;
    }
    const bytes = await readFile(new URL(`../${entry.filePath}`, import.meta.url));
    assert.equal(entry.sha256, sha256(bytes));
    assert.equal(entry.byteLength, bytes.length);
  }
  assert.deepEqual(index.selfIntegrity, {
    status: 'unavailable-self-reference',
    reason: 'dataset-index.json cannot embed a stable hash or byte length of itself without changing those bytes',
  });
});

test('all index relationships resolve to another indexed artifact', async () => {
  const { parsed: index } = await readDeterministicJson('public/data/dataset-index.json');
  const artifactIds = new Set(index.artifacts.map(({ artifactId }) => artifactId));
  for (const entry of index.artifacts) {
    assert.equal(new Set(entry.relatedArtifactIds).size, entry.relatedArtifactIds.length);
    for (const relatedId of entry.relatedArtifactIds) {
      assert.ok(artifactIds.has(relatedId), `${entry.artifactId} references unknown ${relatedId}`);
      assert.notEqual(relatedId, entry.artifactId);
    }
  }
  const expectedRecordCounts = {
    'artifact-catalog': 12,
    'artifact-quality-taxonomy': 8,
    'artifact-synthetic-observations': 120,
    'artifact-review-events': 240,
    'artifact-recollection-tasks': 96,
    'artifact-evaluation-cases': 96,
    'artifact-training-catalog': 18,
    'artifact-role-task-matrix': 72,
    'artifact-career-evidence': 120,
    'artifact-image-generation-completions': 8,
    'artifact-image-generation-queue': 36,
    'artifact-image-rights-policy': 8,
    'artifact-dataset-coverage': 10,
    'artifact-dataset-index': 14,
  };
  assert.deepEqual(
    Object.fromEntries(index.artifacts.map(({ artifactId, recordCount }) => [artifactId, recordCount])),
    expectedRecordCounts,
  );
});

test('coverage counts are derived from the canonical artifacts', async () => {
  const inputs = await canonicalInputs();
  const { parsed: coverage } = await readDeterministicJson('public/data/dataset-coverage.json');
  const {
    catalog,
    taxonomy,
    observations,
    reviewEvents,
    recollectionTasks,
    evaluationCases,
    trainingCatalog,
    roleTaskMatrix,
    careerEvidence,
    imageGenerationCompletions,
    imageGenerationQueue,
  } = inputs.documents;
  assert.deepEqual(coverage.canonicalCounts, {
    fields: new Set(catalog.syntheticExamples.map(({ field }) => field)).size,
    scenarios: catalog.syntheticExamples.length,
    qualityCodes: taxonomy.issueCodes.length,
    proposedRoles: catalog.occupationPaths.length,
    readinessGates: catalog.collectionGates.length,
    observations: observations.records.length,
    reviewEvents: reviewEvents.events.length,
    recollectionTasks: recollectionTasks.tasks.length,
    evaluationCases: evaluationCases.cases.length,
    trainingModules: trainingCatalog.modules.length,
    roleTaskMappings: roleTaskMatrix.mappings.length,
    careerEvidenceRecords: careerEvidence.evidence.length,
    imageGenerationCompletions: imageGenerationCompletions.completions.length,
    plannedImageQueueItems: imageGenerationQueue.items.length,
  });
  assert.deepEqual(coverage.canonicalCounts, {
    fields: 2,
    scenarios: 12,
    qualityCodes: 8,
    proposedRoles: 6,
    readinessGates: 5,
    observations: 120,
    reviewEvents: 240,
    recollectionTasks: 96,
    evaluationCases: 96,
    trainingModules: 18,
    roleTaskMappings: 72,
    careerEvidenceRecords: 120,
    imageGenerationCompletions: 8,
    plannedImageQueueItems: 36,
  });
  assert.equal(coverage.fieldCoverage.length, 2);
  assert.equal(coverage.scenarioCoverage.length, 12);
  assert.equal(coverage.qualityCodeCoverage.length, 8);
  assert.equal(coverage.proposedRoleCoverage.length, 6);
  assert.equal(coverage.readinessGateCoverage.length, 5);
  assert.deepEqual(new Set(coverage.fieldCoverage.map(({ field }) => field)), new Set(['manufacturing', 'small-business']));
  assert.ok(coverage.proposedRoleCoverage.every(({ status }) => status === 'proposed-career-path'));
  assert.ok(coverage.readinessGateCoverage.every(({ completionClaimCount }) => completionClaimCount === 0));
});

test('coverage exposes complete combinations, lifecycle gaps, and planned image slots', async () => {
  const { parsed: coverage } = await readDeterministicJson('public/data/dataset-coverage.json');
  const expectedCombinations = {
    'scenario-quality-code': 96,
    'proposed-role-scenario': 72,
    'scenario-image-variation': 36,
    'observation-review-event-type': 240,
    'non-normal-observation-recollection': 96,
    'observation-career-evidence': 120,
    'observation-readiness-gate-applicability': 600,
    'scenario-quality-evaluation-case': 96,
  };
  assert.deepEqual(
    Object.fromEntries(coverage.combinationCoverage.map(({ combinationId, expectedCount }) => [combinationId, expectedCount])),
    expectedCombinations,
  );
  assert.ok(coverage.combinationCoverage.every(({ expectedCount, actualCount, missingCount, missingKeys }) => (
    actualCount === expectedCount && missingCount === 0 && missingKeys.length === 0
  )));
  assert.equal(coverage.missingCoverage.missingCombinationCount, 0);
  assert.deepEqual(coverage.missingCoverage.lifecycleStagesWithoutCanonicalRecords, [
    'request',
    'rights-aware-dataset-version',
    'controlled-use',
  ]);
  assert.equal(coverage.missingCoverage.plannedImageSlotsAwaitingGeneration.length, 28);
  assert.deepEqual(coverage.plannedImageCoverage, {
    plannedSlotCount: 36,
    plannedNotGeneratedCount: 28,
    generatedQueueOutputCount: 8,
    rightsReviewedQueueOutputCount: 8,
    completionLedgerCount: 8,
    totalManifestAssetCount: 11,
    preExistingPartialAssetCount: 3,
    completeLedgerAssetCount: 8,
    manifestAssetIds: [
      'asset-mfg-001-inspection',
      'asset-smb-001-bakery-rack',
      'asset-smb-002-cup-sorting',
      'asset-mfg-001-component-surface-baseline-accepted',
      'asset-mfg-002-fastener-tray-baseline-accepted',
      'asset-mfg-003-safety-zone-baseline-accepted',
      'asset-smb-003-produce-weighing-baseline-accepted',
      'asset-smb-004-florist-wrapping-baseline-accepted',
      'asset-smb-006-ingredient-bin-baseline-accepted',
      'asset-mfg-004-packaging-check-baseline-accepted',
      'asset-mfg-005-bin-label-baseline-accepted',
    ],
    separationBoundary: 'queue 36개 중 8개만 completion ledger에 따라 생성·사람 검수·project-use 등록되었고 28개는 생성 전 계획이며, manifest는 기존 partial provenance 3개와 신규 complete provenance 8개를 구분함',
  });
  assert.deepEqual(
    Object.fromEntries(coverage.fieldCoverage.map((entry) => [entry.field, {
      imageGenerationCompletionCount: entry.imageGenerationCompletionCount,
      generatedQueueOutputCount: entry.generatedQueueOutputCount,
    }])),
    {
      manufacturing: { imageGenerationCompletionCount: 5, generatedQueueOutputCount: 5 },
      'small-business': { imageGenerationCompletionCount: 3, generatedQueueOutputCount: 3 },
    },
  );
  assert.deepEqual(
    Object.fromEntries(coverage.lifecycleStageCoverage.map(({ stageId, canonicalCount }) => [stageId, canonicalCount])),
    {
      request: 0,
      'consent-scope-readiness': 120,
      'training-assignment': 72,
      collection: 120,
      'assistive-ai-signal': 120,
      'independent-human-review': 120,
      'rights-aware-dataset-version': 0,
      'controlled-use': 0,
      'incident-recollection': 96,
    },
  );
});

test('index and coverage preserve synthetic, rights, and external-link truth boundaries', async () => {
  const { raw: indexRaw, parsed: index } = await readDeterministicJson('public/data/dataset-index.json');
  const { raw: coverageRaw, parsed: coverage } = await readDeterministicJson('public/data/dataset-coverage.json');
  for (const document of [index, coverage]) {
    assert.equal(document.sourceType, 'AI-generated synthetic example');
    assert.equal(document.rights.thirdPartyMediaUsed, false);
    assert.equal(document.rights.codeLicenseApplies, false);
    assert.match(document.usageBoundary, /실제 사람/);
    assert.match(document.usageBoundary, /실제 현장 수집/);
    assert.match(document.usageBoundary, /승인 학습 데이터/);
    assert.match(document.usageBoundary, /고용/);
  }
  assert.deepEqual(coverage.externalCatalogCoverage, {
    candidateCount: 3,
    externalCatalogLinkCount: 3,
    liveApiCount: 0,
    statusCounts: { 'candidate-not-connected': 3 },
    boundary: '외부 후보는 링크이며 실제 원본 다운로드 또는 Live API 연동을 뜻하지 않음',
  });
  const combined = `${indexRaw}\n${coverageRaw}`;
  assert.doesNotMatch(combined, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  assert.doesNotMatch(combined, /(?<!\d)01[016789][-\.\s]?\d{3,4}[-\.\s]?\d{4}(?!\d)/);
  assert.doesNotMatch(combined, /\bsk-[A-Za-z0-9_-]{20,}\b/);
});
