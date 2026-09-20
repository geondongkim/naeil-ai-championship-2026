import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildPublic, projectRoot } from '../scripts/build.mjs';
import {
  buildEvaluationCases,
  buildSyntheticArtifacts,
  DEFAULT_SEED,
} from '../scripts/generate-synthetic-dataset.mjs';

const root = new URL('../', import.meta.url);

async function readJson(relativePath) {
  const raw = await readFile(new URL(relativePath, root), 'utf8');
  const parsed = JSON.parse(raw);
  assert.equal(raw, `${JSON.stringify(parsed, null, 2)}\n`, `${relativePath} must use deterministic two-space JSON`);
  return { raw, parsed };
}

async function canonicalInputs() {
  const [catalog, taxonomy, observations, reviewEvents, recollectionTasks] = await Promise.all([
    readJson('public/data/catalog.json'),
    readJson('public/data/quality-taxonomy.json'),
    readJson('public/data/synthetic-observations.json'),
    readJson('public/data/review-events.json'),
    readJson('public/data/recollection-tasks.json'),
  ]);
  return {
    catalog: catalog.parsed,
    taxonomy: taxonomy.parsed,
    observations: observations.parsed,
    reviewEvents: reviewEvents.parsed,
    recollectionTasks: recollectionTasks.parsed,
  };
}

test('evaluation cases form the deterministic twelve-scenario by eight-issue cross product', async () => {
  const inputs = await canonicalInputs();
  const first = buildEvaluationCases({ seed: DEFAULT_SEED, ...inputs });
  const second = buildEvaluationCases({ seed: DEFAULT_SEED, ...inputs });
  assert.equal(first.serialized, second.serialized);

  const { raw, parsed: dataset } = await readJson('public/data/evaluation-cases.json');
  assert.equal(raw, first.serialized);
  assert.equal(dataset.caseCount, 96);
  assert.equal(dataset.cases.length, 96);
  assert.equal(new Set(dataset.cases.map(({ caseId }) => caseId)).size, 96);
  assert.deepEqual(
    Object.fromEntries(['manufacturing', 'small-business'].map((field) => [
      field,
      dataset.cases.filter((evaluationCase) => evaluationCase.field === field).length,
    ])),
    { manufacturing: 48, 'small-business': 48 },
  );

  const scenarios = inputs.catalog.syntheticExamples.map(({ id }) => id);
  const issueCodes = inputs.taxonomy.issueCodes.map(({ code }) => code);
  const expectedGrid = scenarios.flatMap((scenarioId) => issueCodes.map((issueCode) => `${scenarioId}:${issueCode}`));
  assert.deepEqual(
    dataset.cases.map(({ scenarioId, issueCode }) => `${scenarioId}:${issueCode}`).sort(),
    expectedGrid.sort(),
  );
});

test('cases reference canonical scenarios, taxonomy, observations, and human lifecycle records', async () => {
  const inputs = await canonicalInputs();
  const { parsed: dataset } = await readJson('public/data/evaluation-cases.json');
  const scenarioById = new Map(inputs.catalog.syntheticExamples.map((scenario) => [scenario.id, scenario]));
  const issueByCode = new Map(inputs.taxonomy.issueCodes.map((issue) => [issue.code, issue]));
  const observationById = new Map(inputs.observations.records.map((observation) => [observation.id, observation]));
  const eventById = new Map(inputs.reviewEvents.events.map((event) => [event.eventId, event]));
  const taskById = new Map(inputs.recollectionTasks.tasks.map((task) => [task.taskId, task]));

  for (const evaluationCase of dataset.cases) {
    const scenario = scenarioById.get(evaluationCase.scenarioId);
    const issue = issueByCode.get(evaluationCase.issueCode);
    assert.ok(scenario);
    assert.ok(issue);
    assert.equal(evaluationCase.field, scenario.field);
    assert.ok(evaluationCase.sourceObservationIds.length >= 1);
    assert.equal(evaluationCase.sourceHumanReviewEventIds.length, evaluationCase.sourceObservationIds.length);
    for (const observationId of evaluationCase.sourceObservationIds) {
      const observation = observationById.get(observationId);
      assert.ok(observation);
      assert.equal(observation.scenarioId, evaluationCase.scenarioId);
      assert.deepEqual(observation.issueCodes, [evaluationCase.issueCode]);
    }
    for (const eventId of evaluationCase.sourceHumanReviewEventIds) {
      const event = eventById.get(eventId);
      assert.ok(event);
      assert.ok(evaluationCase.sourceObservationIds.includes(event.observationId));
      assert.equal(event.eventType, 'independent_human_review');
      assert.equal(event.decisionAuthority, 'human');
    }
    for (const taskId of evaluationCase.sourceRecollectionTaskIds) {
      const task = taskById.get(taskId);
      assert.ok(task);
      assert.ok(evaluationCase.sourceObservationIds.includes(task.sourceObservationId));
      assert.ok(task.scopedIssueCodes.includes(evaluationCase.issueCode));
    }
    assert.equal(evaluationCase.expectedHumanDisposition, issue.humanReviewDisposition);
  }
});

test('AI expectations are bounded assistive schema ranges with human-only dispositions', async () => {
  const { parsed: dataset, raw } = await readJson('public/data/evaluation-cases.json');
  const allowedSchemaValues = {
    task_match: new Set(['good', 'review', 'poor']),
    lighting: new Set(['good', 'review', 'poor']),
    framing: new Set(['good', 'review', 'poor']),
    blur: new Set(['good', 'review', 'poor']),
    privacy_risk: new Set(['none', 'possible', 'clear']),
    recommendation: new Set(['ready_for_human_review', 'human_review', 'retake']),
  };
  for (const evaluationCase of dataset.cases) {
    assert.equal(evaluationCase.inputMode, 'metadata-only-synthetic-evaluation');
    assert.equal(evaluationCase.decisionAuthority, 'human');
    assert.equal(evaluationCase.expectedAiSignal.signalAuthority, 'assistive-only-no-approval-authority');
    assert.deepEqual(Object.keys(evaluationCase.expectedAiSignal.allowedValues), Object.keys(allowedSchemaValues));
    for (const [field, values] of Object.entries(evaluationCase.expectedAiSignal.allowedValues)) {
      assert.ok(values.length >= 1);
      assert.ok(values.every((value) => allowedSchemaValues[field].has(value)));
    }
    assert.ok(evaluationCase.requiredHumanChecks.includes('independent-final-disposition'));
    if (evaluationCase.issueCode === 'normal') {
      assert.equal(evaluationCase.expectedHumanDisposition, 'independent-human-review-required');
      assert.equal(evaluationCase.recollectionRequired, false);
      assert.equal(evaluationCase.failureReasonCode, null);
      assert.deepEqual(evaluationCase.expectedAiSignal.allowedValues.recommendation, ['ready_for_human_review']);
    } else {
      assert.ok(evaluationCase.failureReasonCode);
      if (evaluationCase.recollectionRequired) {
        assert.match(evaluationCase.failureReasonCode, /^recollect-/);
        assert.equal(evaluationCase.expectedHumanDisposition, 'recollection-required-by-independent-reviewer');
      } else {
        assert.match(evaluationCase.failureReasonCode, /^hold-/);
        assert.ok([
          'independent-human-review-required',
          'blocked-pending-rights-review',
        ].includes(evaluationCase.expectedHumanDisposition));
      }
    }
  }

  const keys = [];
  JSON.parse(raw, (key, value) => {
    if (key) keys.push(key);
    return value;
  });
  const forbiddenMeasurementKeys = new Set([
    'accuracy',
    'score',
    'precision',
    'recall',
    'latency',
    'measuredPerformance',
    'modelOutput',
  ]);
  assert.equal(keys.filter((key) => forbiddenMeasurementKeys.has(key)).length, 0);
  assert.equal(dataset.createdBySyntheticGenerator.modelExecuted, false);
  assert.match(dataset.measurementBoundary, /측정하지 않은/);
});

test('every case preserves metadata-only provenance, rights, and usage boundaries', async () => {
  const { parsed: dataset, raw } = await readJson('public/data/evaluation-cases.json');
  for (const evaluationCase of dataset.cases) {
    assert.ok(evaluationCase.syntheticPromptSummary);
    assert.equal(evaluationCase.sourceType, 'AI-generated synthetic example');
    assert.equal(evaluationCase.status, 'metadata-only-synthetic-evaluation-not-executed');
    assert.equal(evaluationCase.rights.status, 'clean-room-metadata-project-use');
    assert.equal(evaluationCase.rights.thirdPartyMediaUsed, false);
    assert.equal(evaluationCase.rights.codeLicenseApplies, false);
    assert.match(evaluationCase.usageBoundary, /이미지 데이터/);
    assert.match(evaluationCase.usageBoundary, /실제 모델 실행/);
    assert.match(evaluationCase.usageBoundary, /실제 사용자·현장 수집/);
    assert.match(evaluationCase.usageBoundary, /승인 학습 데이터/);
    assert.match(evaluationCase.usageBoundary, /고용 성과/);
  }
  assert.doesNotMatch(raw, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  assert.doesNotMatch(raw, /(?<!\d)01[016789][-\.\s]?\d{3,4}[-\.\s]?\d{4}(?!\d)/);
  assert.doesNotMatch(raw, /\bsk-[A-Za-z0-9_-]{20,}\b/);
});

test('dataset discovery and public build include evaluation cases byte-for-byte', async (t) => {
  const artifacts = await buildSyntheticArtifacts({ seed: DEFAULT_SEED });
  const { raw } = await readJson('public/data/evaluation-cases.json');
  assert.equal(artifacts.serialized.evaluationCases, raw);
  assert.equal(artifacts.datasetCoverage.canonicalCounts.evaluationCases, 96);
  const indexEntry = artifacts.datasetIndex.artifacts.find(({ artifactId }) => artifactId === 'artifact-evaluation-cases');
  assert.ok(indexEntry);
  assert.equal(indexEntry.recordCount, 96);

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'naeil-evaluation-build-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));
  const distDir = path.join(tempRoot, 'dist');
  await buildPublic({
    publicDir: path.join(projectRoot, 'public'),
    distDir,
    writeLatestReport: false,
  });
  const source = await readFile(path.join(projectRoot, 'public/data/evaluation-cases.json'));
  const built = await readFile(path.join(distDir, 'data/evaluation-cases.json'));
  assert.deepEqual(built, source);
});
