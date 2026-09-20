import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildSyntheticArtifacts,
  buildSyntheticLifecycle,
  DEFAULT_SEED,
} from '../scripts/generate-synthetic-dataset.mjs';

const root = new URL('../', import.meta.url);

async function readDeterministicJson(relativePath) {
  const raw = await readFile(new URL(relativePath, root), 'utf8');
  const parsed = JSON.parse(raw);
  assert.equal(raw, `${JSON.stringify(parsed, null, 2)}\n`, `${relativePath} must use deterministic two-space JSON`);
  return { raw, parsed };
}

test('review and recollection lifecycle artifacts are byte-stable for the canonical seed', async () => {
  const first = await buildSyntheticArtifacts({ seed: DEFAULT_SEED });
  const second = await buildSyntheticArtifacts({ seed: DEFAULT_SEED });
  assert.equal(first.serialized.reviewEvents, second.serialized.reviewEvents);
  assert.equal(first.serialized.recollectionTasks, second.serialized.recollectionTasks);

  const reviewEvents = await readDeterministicJson('public/data/review-events.json');
  const recollectionTasks = await readDeterministicJson('public/data/recollection-tasks.json');
  assert.equal(reviewEvents.raw, first.serialized.reviewEvents);
  assert.equal(recollectionTasks.raw, first.serialized.recollectionTasks);

  const observations = await readDeterministicJson('public/data/synthetic-observations.json');
  const taxonomy = await readDeterministicJson('public/data/quality-taxonomy.json');
  const fromCanonicalInputs = buildSyntheticLifecycle({
    seed: DEFAULT_SEED,
    observations: observations.parsed,
    taxonomy: taxonomy.parsed,
  });
  assert.equal(reviewEvents.raw, fromCanonicalInputs.serialized.reviewEvents);
  assert.equal(recollectionTasks.raw, fromCanonicalInputs.serialized.recollectionTasks);

  const alternate = await buildSyntheticArtifacts({ seed: 'naeil-synthetic-review-alt-check' });
  assert.notEqual(alternate.serialized.reviewEvents, first.serialized.reviewEvents);
  assert.deepEqual(
    alternate.reviewEvents.events.map((event) => event.eventId),
    first.reviewEvents.events.map((event) => event.eventId),
    'stable event IDs must not depend on seed',
  );
  assert.deepEqual(
    alternate.recollectionTasks.tasks.map((task) => task.taskId),
    first.recollectionTasks.tasks.map((task) => task.taskId),
    'stable task IDs must not depend on seed',
  );
});

test('every observation has one assistive AI signal followed by one independent human review', async () => {
  const { parsed: observations } = await readDeterministicJson('public/data/synthetic-observations.json');
  const { parsed: taxonomy } = await readDeterministicJson('public/data/quality-taxonomy.json');
  const { parsed: lifecycle } = await readDeterministicJson('public/data/review-events.json');
  assert.equal(lifecycle.eventCount, 240);
  assert.deepEqual(lifecycle.eventTypeCounts, {
    assistive_ai_signal: 120,
    independent_human_review: 120,
  });
  assert.deepEqual(lifecycle.actorSeparation, {
    collectorMaySelfReview: false,
    aiMayApprove: false,
    independentHumanReviewerRequired: true,
  });

  const observationsById = new Map(observations.records.map((observation) => [observation.id, observation]));
  const taxonomyCodes = new Set(taxonomy.issueCodes.map((issue) => issue.code));
  const eventIds = lifecycle.events.map((event) => event.eventId);
  assert.equal(new Set(eventIds).size, 240);

  for (const [observationIndex, observation] of observations.records.entries()) {
    const events = lifecycle.events.filter((event) => event.observationId === observation.id);
    assert.equal(events.length, 2, `${observation.id} must have exactly two lifecycle events`);
    const ai = events.find((event) => event.eventType === 'assistive_ai_signal');
    const human = events.find((event) => event.eventType === 'independent_human_review');
    assert.ok(ai);
    assert.ok(human);
    assert.equal(ai.actorRole, 'ai-quality-assistant');
    assert.equal(ai.decisionAuthority, 'assistive-only-no-approval-authority');
    assert.doesNotMatch(ai.disposition, /accept|approv|승인/i);
    assert.equal(human.actorRole, 'independent-quality-reviewer');
    assert.equal(human.decisionAuthority, 'human');
    assert.doesNotMatch(human.actorRole, /collector|수집자/i);
    assert.equal(ai.sequence, `review-seq-${String((observationIndex * 2) + 1).padStart(6, '0')}`);
    assert.equal(human.sequence, `review-seq-${String((observationIndex * 2) + 2).padStart(6, '0')}`);

    for (const event of events) {
      assert.ok(observationsById.has(event.observationId));
      assert.equal(event.scenarioId, observation.scenarioId);
      assert.equal(event.field, observation.field);
      assert.deepEqual(event.issueCodes, observation.issueCodes);
      assert.ok(event.issueCodes.every((code) => taxonomyCodes.has(code)));
      assert.ok(event.reasonCode);
      assert.equal(event.datasetVersionFrom, 'naeil-synthetic-observations-v1@1.0.0');
      assert.equal(event.datasetVersionTo, 'naeil-synthetic-observations-v1@1.0.0');
      assert.equal(event.sourceType, 'AI-generated synthetic example');
      assert.equal(event.status, 'recorded-deterministic-synthetic-event');
      assert.equal(event.rights.thirdPartyMediaUsed, false);
      assert.equal(event.rights.codeLicenseApplies, false);
      assert.match(event.usageBoundary, /실제 청년 수집 또는 청년 수행/);
      assert.match(event.usageBoundary, /승인 학습 데이터/);
    }

    if (/accept|approv|승인/i.test(human.disposition)) assert.equal(human.decisionAuthority, 'human');
  }
});

test('every non-normal quality observation has one scoped recollection task', async () => {
  const { parsed: observations } = await readDeterministicJson('public/data/synthetic-observations.json');
  const { parsed: lifecycle } = await readDeterministicJson('public/data/review-events.json');
  const { parsed: recollection } = await readDeterministicJson('public/data/recollection-tasks.json');
  const nonNormal = observations.records.filter((observation) => observation.issueCodes.some((code) => code !== 'normal'));
  const recollectionRequired = observations.records.filter((observation) => observation.expectedQualityLabel === 'recollection-required');
  assert.equal(nonNormal.length, 96);
  assert.equal(recollection.taskCount, 96);
  assert.equal(recollection.tasks.length, 96);
  assert.equal(new Set(recollection.tasks.map((task) => task.taskId)).size, 96);

  const tasksByObservation = new Map(recollection.tasks.map((task) => [task.sourceObservationId, task]));
  assert.equal(tasksByObservation.size, 96);
  for (const observation of nonNormal) {
    const task = tasksByObservation.get(observation.id);
    assert.ok(task, `${observation.id} must link to a recollection task`);
    assert.equal(task.scenarioId, observation.scenarioId);
    assert.equal(task.field, observation.field);
    assert.deepEqual(task.scopedIssueCodes, observation.issueCodes.filter((code) => code !== 'normal'));
    assert.ok(task.reason);
    assert.deepEqual(task.requiredFiveGates.map(({ gate }) => gate), [
      'site-consent',
      'training',
      'safety',
      'task-scope',
      'compensation-acknowledgement',
    ]);
    assert.ok(task.requiredFiveGates.every(({ state }) => state === 'must-be-reconfirmed-before-equivalent-real-recollection'));
    assert.equal(task.allowedTaskScope.taskType, observation.taskType);
    assert.equal(task.allowedTaskScope.targetArea, observation.observableAttributes.targetArea);
    assert.match(task.allowedTaskScope.boundary, /실제 현장 작업을 지시하지 않음/);
    assert.ok(task.safetyReminder);
    assert.equal(task.humanAssigneeRole, 'recollection-operator');
    assert.equal(task.retryVersion, '1.0.0-synthetic-retry');
    assert.equal(task.completionStatus, 'not-started-synthetic-plan');
    assert.equal(task.sourceType, 'AI-generated synthetic example');
    assert.equal(task.status, 'deterministic-recollection-plan-not-field-assignment');
    assert.equal(task.rights.thirdPartyMediaUsed, false);
    assert.equal(task.rights.codeLicenseApplies, false);
    assert.match(task.usageBoundary, /파트너 현장 데이터/);

    const humanEvent = lifecycle.events.find((event) => (
      event.observationId === observation.id && event.eventType === 'independent_human_review'
    ));
    assert.equal(humanEvent.recollectionTaskId, task.taskId);
  }
  for (const observation of recollectionRequired) assert.ok(tasksByObservation.has(observation.id));
  for (const observation of observations.records.filter((record) => record.issueCodes.includes('normal'))) {
    assert.equal(tasksByObservation.has(observation.id), false);
  }
});

test('lifecycle covers both fields and twelve scenarios without names, timestamps, or external Live API claims', async () => {
  const { parsed: catalog } = await readDeterministicJson('public/data/catalog.json');
  const { raw: eventsRaw, parsed: lifecycle } = await readDeterministicJson('public/data/review-events.json');
  const { raw: tasksRaw, parsed: recollection } = await readDeterministicJson('public/data/recollection-tasks.json');
  assert.deepEqual(new Set(lifecycle.events.map((event) => event.field)), new Set(['manufacturing', 'small-business']));
  assert.deepEqual(new Set(recollection.tasks.map((task) => task.field)), new Set(['manufacturing', 'small-business']));
  assert.equal(new Set(lifecycle.events.map((event) => event.scenarioId)).size, 12);
  assert.equal(new Set(recollection.tasks.map((task) => task.scenarioId)).size, 12);
  for (const scenarioId of new Set(recollection.tasks.map((task) => task.scenarioId))) {
    assert.equal(recollection.tasks.filter((task) => task.scenarioId === scenarioId).length, 8);
  }

  const combined = `${eventsRaw}\n${tasksRaw}`;
  assert.doesNotMatch(combined, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  assert.doesNotMatch(combined, /(?<!\d)01[016789][-\.\s]?\d{3,4}[-\.\s]?\d{4}(?!\d)/);
  assert.doesNotMatch(combined, /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  assert.doesNotMatch(combined, /\bsk-[A-Za-z0-9_-]{20,}\b/);
  assert.doesNotMatch(combined, /personName|reviewerName|assigneeName/i);
  assert.match(lifecycle.logicalSequenceBasis, /deterministic order/);
  assert.match(recollection.assignmentBoundary, /실제 사람 배정이 아닌/);

  for (const candidate of catalog.externalCatalogCandidates) {
    assert.equal(candidate.sourceType, 'External catalog link');
    assert.equal(candidate.liveApi, false);
    assert.match(candidate.usageBoundary, /Live API가 아님/);
  }
});
