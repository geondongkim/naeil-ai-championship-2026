import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildSyntheticArtifacts,
  buildTrainingCareerArtifacts,
  DEFAULT_SEED,
} from '../scripts/generate-synthetic-dataset.mjs';

const root = new URL('../', import.meta.url);

async function readDeterministicJson(relativePath) {
  const raw = await readFile(new URL(relativePath, root), 'utf8');
  const parsed = JSON.parse(raw);
  assert.equal(raw, `${JSON.stringify(parsed, null, 2)}\n`, `${relativePath} must use deterministic two-space JSON`);
  return { raw, parsed };
}

async function canonicalInputs() {
  const [catalog, observations, reviewEvents, recollectionTasks] = await Promise.all([
    readDeterministicJson('public/data/catalog.json'),
    readDeterministicJson('public/data/synthetic-observations.json'),
    readDeterministicJson('public/data/review-events.json'),
    readDeterministicJson('public/data/recollection-tasks.json'),
  ]);
  return {
    catalog: catalog.parsed,
    observations: observations.parsed,
    reviewEvents: reviewEvents.parsed,
    recollectionTasks: recollectionTasks.parsed,
  };
}

test('training, role-task, and career evidence outputs are byte-stable from canonical inputs', async () => {
  const inputs = await canonicalInputs();
  const first = buildTrainingCareerArtifacts({ seed: DEFAULT_SEED, ...inputs });
  const second = buildTrainingCareerArtifacts({ seed: DEFAULT_SEED, ...inputs });
  assert.deepEqual(first.serialized, second.serialized);

  const files = {
    trainingCatalog: await readDeterministicJson('public/data/training-catalog.json'),
    roleTaskMatrix: await readDeterministicJson('public/data/role-task-matrix.json'),
    careerEvidence: await readDeterministicJson('public/data/career-evidence.json'),
  };
  for (const [key, file] of Object.entries(files)) assert.equal(file.raw, first.serialized[key]);

  const complete = await buildSyntheticArtifacts({ seed: DEFAULT_SEED });
  for (const key of Object.keys(files)) assert.equal(complete.serialized[key], first.serialized[key]);

  const alternate = buildTrainingCareerArtifacts({ seed: 'naeil-training-career-alt-check', ...inputs });
  assert.notEqual(alternate.serialized.trainingCatalog, first.serialized.trainingCatalog);
  assert.deepEqual(
    alternate.careerEvidence.evidence.map(({ evidenceId }) => evidenceId),
    first.careerEvidence.evidence.map(({ evidenceId }) => evidenceId),
    'stable evidence IDs must not depend on seed',
  );
});

test('six proposed roles have eighteen modules spanning all required competency topics', async () => {
  const { parsed: catalog } = await readDeterministicJson('public/data/catalog.json');
  const { parsed: training } = await readDeterministicJson('public/data/training-catalog.json');
  const roleIds = new Set(catalog.occupationPaths.map(({ id }) => id));
  assert.equal(roleIds.size, 6);
  assert.equal(training.proposedRoleCount, 6);
  assert.equal(training.moduleCount, 18);
  assert.equal(training.modules.length, 18);
  assert.equal(new Set(training.modules.map(({ moduleId }) => moduleId)).size, 18);
  assert.deepEqual(training.proposedRoles.map(({ englishName }) => englishName), [
    'field data coordinator',
    'Physical AI data operator',
    'data quality and safety reviewer',
    'data rights steward',
    'field deployment specialist',
    'recollection operator',
  ]);
  assert.ok(training.proposedRoles.every(({ roleId, status }) => (
    roleIds.has(roleId) && status === 'proposed-occupation-path-not-employment-outcome'
  )));

  const competencyCodes = new Set(training.competencyCatalog.map(({ code }) => code));
  const expectedTopics = new Set([
    'consent',
    'task-scope',
    'compensation-awareness',
    'safety',
    'quality',
    'rights',
    'review',
    'recollection',
  ]);
  assert.deepEqual(new Set(training.modules.flatMap(({ topics }) => topics)), expectedTopics);
  for (const roleId of roleIds) {
    const modules = training.modules.filter(({ targetRoleId }) => targetRoleId === roleId);
    assert.equal(modules.length, 3, `${roleId} must have three deterministic modules`);
  }
  for (const module of training.modules) {
    assert.ok(roleIds.has(module.targetRoleId));
    assert.ok(module.competencyCodes.length >= 1);
    assert.ok(module.competencyCodes.every((code) => competencyCodes.has(code)));
    assert.ok(module.learningObjective);
    assert.equal(module.evidenceMode, 'synthetic-scenario-demonstration-only');
    assert.equal(module.completionClaim, 'not-completed-no-real-learner');
    assert.equal(module.certificationClaim, false);
    assert.equal(module.sourceType, 'AI-generated synthetic example');
    assert.equal(module.rights.thirdPartyMediaUsed, false);
    assert.equal(module.rights.codeLicenseApplies, false);
    assert.match(module.usageBoundary, /실제 사람/);
    assert.match(module.usageBoundary, /교육 수료/);
    assert.match(module.usageBoundary, /자격/);
    assert.match(module.usageBoundary, /고용 성과/);
  }
});

test('role-task matrix is the unique six-role by twelve-scenario cross product', async () => {
  const { parsed: catalog } = await readDeterministicJson('public/data/catalog.json');
  const { parsed: training } = await readDeterministicJson('public/data/training-catalog.json');
  const { parsed: matrix } = await readDeterministicJson('public/data/role-task-matrix.json');
  const roleIds = catalog.occupationPaths.map(({ id }) => id);
  const scenariosById = new Map(catalog.syntheticExamples.map((scenario) => [scenario.id, scenario]));
  const modulesById = new Map(training.modules.map((module) => [module.moduleId, module]));
  const competencyCodes = new Set(training.competencyCatalog.map(({ code }) => code));
  assert.equal(matrix.mappingCount, 72);
  assert.equal(matrix.mappings.length, 72);
  assert.equal(new Set(matrix.mappings.map(({ mappingId }) => mappingId)).size, 72);
  assert.equal(new Set(matrix.mappings.map(({ proposedRoleId, scenarioId }) => `${proposedRoleId}:${scenarioId}`)).size, 72);

  for (const roleId of roleIds) {
    const mappings = matrix.mappings.filter(({ proposedRoleId }) => proposedRoleId === roleId);
    assert.equal(mappings.length, 12);
    assert.deepEqual(new Set(mappings.map(({ scenarioId }) => scenarioId)), new Set(scenariosById.keys()));
    const roleModuleIds = training.modules.filter(({ targetRoleId }) => targetRoleId === roleId).map(({ moduleId }) => moduleId);
    for (const mapping of mappings) {
      const scenario = scenariosById.get(mapping.scenarioId);
      assert.equal(mapping.field, scenario.field);
      assert.equal(mapping.taskType, scenario.taskType);
      assert.deepEqual(mapping.trainingModuleIds, roleModuleIds);
      assert.ok(mapping.trainingModuleIds.every((id) => modulesById.get(id)?.targetRoleId === roleId));
      assert.ok(mapping.competencyCodes.every((code) => competencyCodes.has(code)));
      assert.deepEqual(mapping.authorityBoundary, {
        selfReviewAllowed: false,
        aiApprovalAllowed: false,
        realFieldAssignment: false,
      });
      assert.equal(mapping.sourceType, 'AI-generated synthetic example');
      assert.equal(mapping.rights.thirdPartyMediaUsed, false);
      assert.match(mapping.usageBoundary, /채용/);
    }
  }
  assert.deepEqual(new Set(matrix.mappings.map(({ field }) => field)), new Set(['manufacturing', 'small-business']));
});

test('all 120 observations have one linked demonstration-only career evidence record', async () => {
  const inputs = await canonicalInputs();
  const { parsed: training } = await readDeterministicJson('public/data/training-catalog.json');
  const { parsed: matrix } = await readDeterministicJson('public/data/role-task-matrix.json');
  const { raw, parsed: career } = await readDeterministicJson('public/data/career-evidence.json');
  const observationsById = new Map(inputs.observations.records.map((observation) => [observation.id, observation]));
  const eventsById = new Map(inputs.reviewEvents.events.map((event) => [event.eventId, event]));
  const tasksById = new Map(inputs.recollectionTasks.tasks.map((task) => [task.taskId, task]));
  const modulesById = new Map(training.modules.map((module) => [module.moduleId, module]));
  const mappingsByKey = new Map(matrix.mappings.map((mapping) => [`${mapping.proposedRoleId}:${mapping.scenarioId}`, mapping]));

  assert.equal(career.evidenceCount, 120);
  assert.equal(career.evidence.length, 120);
  assert.equal(career.syntheticProfileCount, 6);
  assert.equal(new Set(career.evidence.map(({ evidenceId }) => evidenceId)).size, 120);
  assert.equal(new Set(career.evidence.map(({ sourceObservationId }) => sourceObservationId)).size, 120);
  assert.deepEqual(new Set(career.evidence.map(({ sourceObservationId }) => sourceObservationId)), new Set(observationsById.keys()));
  assert.deepEqual(new Set(career.evidence.map(({ field }) => field)), new Set(['manufacturing', 'small-business']));
  assert.equal(new Set(career.evidence.map(({ scenarioId }) => scenarioId)).size, 12);
  assert.equal(new Set(career.evidence.map(({ proposedRoleId }) => proposedRoleId)).size, 6);
  assert.deepEqual(career.verificationBoundary, {
    syntheticProfilesAreRealPeople: false,
    collectorMayVerifyOwnEvidence: false,
    aiMayApproveEvidence: false,
    independentHumanVerifierRequired: true,
  });

  for (const evidence of career.evidence) {
    const observation = observationsById.get(evidence.sourceObservationId);
    assert.ok(observation);
    assert.equal(evidence.field, observation.field);
    assert.equal(evidence.scenarioId, observation.scenarioId);
    assert.match(evidence.syntheticProfileId, /^synthetic-profile-\d{3}$/);

    const aiEvent = eventsById.get(evidence.linkedAssistiveSignalEventId);
    const humanEvent = eventsById.get(evidence.linkedReviewEventId);
    assert.equal(aiEvent?.observationId, observation.id);
    assert.equal(aiEvent?.eventType, 'assistive_ai_signal');
    assert.equal(aiEvent?.decisionAuthority, 'assistive-only-no-approval-authority');
    assert.doesNotMatch(aiEvent.disposition, /accept|approv|승인/i);
    assert.equal(humanEvent?.observationId, observation.id);
    assert.equal(humanEvent?.eventType, 'independent_human_review');
    assert.equal(humanEvent?.actorRole, 'independent-quality-reviewer');
    assert.equal(humanEvent?.decisionAuthority, 'human');

    if (evidence.recollectionTaskId === null) {
      assert.equal(inputs.recollectionTasks.tasks.some(({ sourceObservationId }) => sourceObservationId === observation.id), false);
    } else {
      assert.equal(tasksById.get(evidence.recollectionTaskId)?.sourceObservationId, observation.id);
    }

    const mapping = mappingsByKey.get(`${evidence.proposedRoleId}:${evidence.scenarioId}`);
    assert.ok(mapping);
    assert.deepEqual(evidence.competencyCodes, mapping.competencyCodes);
    assert.deepEqual(evidence.trainingModuleIds, mapping.trainingModuleIds);
    assert.ok(evidence.trainingModuleIds.every((moduleId) => modulesById.get(moduleId)?.targetRoleId === evidence.proposedRoleId));
    assert.equal(evidence.verificationStatus, 'demonstration-only-reviewed-not-training-completion');
    assert.equal(evidence.verifierRole, 'independent-career-evidence-reviewer');
    assert.doesNotMatch(evidence.verifierRole, /collector|수집자/i);
    assert.equal(evidence.decisionAuthority, 'human');
    assert.equal(evidence.sourceType, 'AI-generated synthetic example');
    assert.equal(evidence.status, 'synthetic-demonstration-not-employment-or-credential');
    assert.equal(evidence.rights.thirdPartyMediaUsed, false);
    assert.equal(evidence.rights.codeLicenseApplies, false);
    assert.match(evidence.usageBoundary, /실제 사람/);
    assert.match(evidence.usageBoundary, /교육 수료/);
    assert.match(evidence.usageBoundary, /자격/);
    assert.match(evidence.usageBoundary, /채용/);
    assert.match(evidence.usageBoundary, /임금/);
    assert.match(evidence.usageBoundary, /고용 성과/);
  }

  assert.doesNotMatch(raw, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  assert.doesNotMatch(raw, /(?<!\d)01[016789][-\.\s]?\d{3,4}[-\.\s]?\d{4}(?!\d)/);
  assert.doesNotMatch(raw, /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  assert.doesNotMatch(raw, /personName|learnerName|reviewerName|assigneeName/i);
});

test('external catalog candidates remain links rather than Live API integrations', async () => {
  const { parsed: catalog } = await readDeterministicJson('public/data/catalog.json');
  for (const candidate of catalog.externalCatalogCandidates) {
    assert.equal(candidate.sourceType, 'External catalog link');
    assert.equal(candidate.status, 'candidate-not-connected');
    assert.equal(candidate.liveApi, false);
    assert.match(candidate.usageBoundary, /Live API가 아님/);
  }
});
