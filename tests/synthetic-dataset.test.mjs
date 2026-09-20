import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildSyntheticArtifacts,
  DEFAULT_SEED,
} from '../scripts/generate-synthetic-dataset.mjs';

const root = new URL('../', import.meta.url);

async function readDeterministicJson(relativePath) {
  const raw = await readFile(new URL(relativePath, root), 'utf8');
  const parsed = JSON.parse(raw);
  assert.equal(raw, `${JSON.stringify(parsed, null, 2)}\n`, `${relativePath} must use deterministic two-space JSON`);
  return { raw, parsed };
}

test('same seed regenerates all synthetic artifacts byte-for-byte', async () => {
  const first = await buildSyntheticArtifacts({ seed: DEFAULT_SEED });
  const second = await buildSyntheticArtifacts({ seed: DEFAULT_SEED });
  assert.deepEqual(first.serialized, second.serialized);

  const catalog = await readDeterministicJson('public/data/catalog.json');
  const observations = await readDeterministicJson('public/data/synthetic-observations.json');
  const taxonomy = await readDeterministicJson('public/data/quality-taxonomy.json');
  assert.equal(catalog.raw, first.serialized.catalog);
  assert.equal(observations.raw, first.serialized.observations);
  assert.equal(taxonomy.raw, first.serialized.taxonomy);

  const alternate = await buildSyntheticArtifacts({ seed: 'naeil-synthetic-observations-alt-check' });
  assert.notEqual(alternate.serialized.observations, first.serialized.observations);
  assert.deepEqual(
    alternate.observations.records.map((record) => record.id),
    first.observations.records.map((record) => record.id),
    'stable IDs must not depend on seed',
  );
});

test('catalog defines twelve balanced canonical scenarios and 120 balanced observations', async () => {
  const { parsed: catalog } = await readDeterministicJson('public/data/catalog.json');
  const { parsed: dataset } = await readDeterministicJson('public/data/synthetic-observations.json');
  assert.equal(catalog.syntheticExamples.length, 12);
  assert.equal(dataset.scenarioCount, 12);
  assert.equal(dataset.recordCount, 120);
  assert.equal(dataset.recordsPerScenario, 10);
  assert.deepEqual(dataset.fieldCounts, { manufacturing: 60, 'small-business': 60 });

  const scenarioIds = new Set(catalog.syntheticExamples.map((scenario) => scenario.id));
  assert.equal(scenarioIds.size, 12);
  for (const field of ['manufacturing', 'small-business']) {
    assert.equal(catalog.syntheticExamples.filter((scenario) => scenario.field === field).length, 6);
    assert.equal(dataset.records.filter((record) => record.field === field).length, 60);
  }
  for (const scenario of catalog.syntheticExamples) {
    assert.equal(dataset.records.filter((record) => record.scenarioId === scenario.id).length, 10);
  }
  assert.equal(catalog.syntheticObservationDataset.recordCount, 120);
  assert.equal(catalog.syntheticObservationDataset.scenarioCount, 12);
  assert.equal(catalog.syntheticObservationDataset.sourceType, 'AI-generated synthetic example');
});

test('records carry complete synthetic provenance, rights, gates, and independent review boundaries', async () => {
  const { parsed: dataset } = await readDeterministicJson('public/data/synthetic-observations.json');
  const required = [
    'id',
    'field',
    'scenarioId',
    'taskType',
    'syntheticReference',
    'observableAttributes',
    'expectedQualityLabel',
    'issueCodes',
    'confidenceBand',
    'humanReviewDisposition',
    'recollectionReason',
    'fiveGateApplicability',
    'sourceType',
    'status',
    'rights',
    'usageBoundary',
    'createdBySyntheticGenerator',
    'version',
  ];
  const ids = dataset.records.map((record) => record.id);
  assert.equal(new Set(ids).size, 120);
  assert.ok(ids.every((id) => /^obs-(mfg|smb)-\d{3}-\d{3}$/.test(id)));

  for (const record of dataset.records) {
    assert.deepEqual(Object.keys(record), required);
    assert.ok(['asset-reference', 'prompt-reference'].includes(record.syntheticReference.type));
    assert.equal(record.sourceType, 'AI-generated synthetic example');
    assert.equal(record.status, 'synthetic-not-collected-not-training-approved');
    assert.equal(record.rights.thirdPartyMediaUsed, false);
    assert.equal(record.rights.codeLicenseApplies, false);
    assert.match(record.usageBoundary, /실제 청년 수집/);
    assert.match(record.usageBoundary, /파트너 현장 데이터/);
    assert.match(record.usageBoundary, /승인 학습 데이터/);
    assert.match(record.usageBoundary, /고용 성과/);
    assert.equal(record.createdBySyntheticGenerator.script, 'scripts/generate-synthetic-dataset.mjs');
    assert.equal(record.createdBySyntheticGenerator.seed, DEFAULT_SEED);
    assert.equal(record.createdBySyntheticGenerator.deterministic, true);
    assert.equal(record.createdBySyntheticGenerator.humanFinalDecisionRequired, true);
    assert.doesNotMatch(record.humanReviewDisposition, /collector|self|수집자/i);
    assert.equal(record.version, '1.0.0');

    assert.deepEqual(Object.keys(record.fiveGateApplicability), [
      'site-consent',
      'training',
      'safety',
      'task-scope',
      'compensation-acknowledgement',
    ]);
    for (const gate of Object.values(record.fiveGateApplicability)) {
      assert.equal(gate.appliesToEquivalentRealCollection, true);
      assert.equal(gate.syntheticRecordState, 'not-evaluated-synthetic');
    }
  }
});

test('quality taxonomy covers every issue and each scenario has meaningful variation', async () => {
  const { parsed: dataset } = await readDeterministicJson('public/data/synthetic-observations.json');
  const { parsed: taxonomy } = await readDeterministicJson('public/data/quality-taxonomy.json');
  const expectedCodes = [
    'blur',
    'occlusion',
    'duplicate',
    'out-of-scope',
    'safety-risk',
    'consent-rights-unconfirmed',
    'label-mismatch',
    'normal',
  ];
  assert.deepEqual(taxonomy.issueCodes.map((issue) => issue.code), expectedCodes);
  assert.equal(taxonomy.collectorSelfApprovalAllowed, false);
  assert.match(taxonomy.decisionBoundary, /독립적인 사람이 최종 판단/);

  const taxonomyByCode = new Map(taxonomy.issueCodes.map((issue) => [issue.code, issue]));
  const labels = new Set(taxonomy.qualityLabels.map((label) => label.id));
  const confidenceBands = new Set(taxonomy.confidenceBands.map((band) => band.id));
  for (const issue of taxonomy.issueCodes) {
    assert.ok(issue.criteria.trigger);
    assert.ok(issue.criteria.clear);
    assert.ok(issue.humanReviewDisposition);
    if (issue.code === 'normal') assert.equal(issue.recollectionGuidance, null);
    else assert.ok(issue.recollectionGuidance);
  }

  for (const record of dataset.records) {
    assert.ok(labels.has(record.expectedQualityLabel));
    assert.ok(confidenceBands.has(record.confidenceBand));
    assert.ok(record.issueCodes.length >= 1);
    for (const code of record.issueCodes) assert.ok(taxonomyByCode.has(code), `unknown issue code ${code}`);
    if (['recollection-required', 'rights-blocked'].includes(record.expectedQualityLabel)) {
      assert.ok(record.recollectionReason);
    } else {
      assert.equal(record.recollectionReason, null);
    }
    if (record.issueCodes.includes('normal')) assert.deepEqual(record.issueCodes, ['normal']);
  }

  for (const scenarioId of new Set(dataset.records.map((record) => record.scenarioId))) {
    const records = dataset.records.filter((record) => record.scenarioId === scenarioId);
    const signatures = records.map((record) => JSON.stringify({
      observableAttributes: record.observableAttributes,
      expectedQualityLabel: record.expectedQualityLabel,
      issueCodes: record.issueCodes,
      recollectionReason: record.recollectionReason,
    }));
    assert.equal(new Set(signatures).size, 10, `${scenarioId} must have ten distinct quality observations`);
    assert.deepEqual(new Set(records.flatMap((record) => record.issueCodes)), new Set(expectedCodes));
  }
});

test('synthetic data contains no PII or Live API mislabel and preserves disconnected catalog candidates', async () => {
  const { raw: observationsRaw, parsed: dataset } = await readDeterministicJson('public/data/synthetic-observations.json');
  const { raw: taxonomyRaw } = await readDeterministicJson('public/data/quality-taxonomy.json');
  const { parsed: catalog } = await readDeterministicJson('public/data/catalog.json');
  const combined = `${observationsRaw}\n${taxonomyRaw}`;
  assert.doesNotMatch(combined, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  assert.doesNotMatch(combined, /(?<!\d)01[016789][-\.\s]?\d{3,4}[-\.\s]?\d{4}(?!\d)/);
  assert.doesNotMatch(combined, /\bsk-[A-Za-z0-9_-]{20,}\b/);
  assert.ok(dataset.records.every((record) => record.observableAttributes.containsPersonalData === false));
  assert.ok(dataset.records.every((record) => record.observableAttributes.containsPrivateSiteDetails === false));

  for (const candidate of catalog.externalCatalogCandidates) {
    assert.equal(candidate.sourceType, 'External catalog link');
    assert.equal(candidate.status, 'candidate-not-connected');
    assert.equal(candidate.liveApi, false);
    assert.match(candidate.usageBoundary, /Live API가 아님/);
  }
});
