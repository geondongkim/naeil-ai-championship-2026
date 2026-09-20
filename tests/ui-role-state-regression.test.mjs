import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../public/app.mjs', import.meta.url), 'utf8');

test('gate ownership and collection remain fail-closed until all five gates are confirmed', () => {
  assert.match(source, /requester: \["scope"\]/);
  assert.match(source, /provider: \["consent", "safety", "scope"\]/);
  assert.match(source, /collector: \["training", "safety", "compensation"\]/);
  assert.match(source, /reviewer: \[\]/);
  assert.match(source, /const allGates = \(\) => gateDefinitions\.every/);
  assert.match(source, /"use-synthetic"[\s\S]*ready \? "" : "disabled"/);
  assert.match(source, /"add-record"[\s\S]*ready && c\.source \? "" : "disabled"/);
  assert.match(source, /state\.role !== "collector" \|\| !allGates\(\)/);
});

test('protected actions enforce role, prior-state, and human-authority guards', () => {
  assert.match(source, /state\.role !== "collector" \|\| f\.collection\.records < 1/);
  assert.match(source, /state\.role !== "collector" \|\| f\.ai\.status !== "complete" \|\| f\.ai\.decisionAuthority !== "human"/);
  assert.match(source, /state\.role !== "reviewer"/);
  assert.match(source, /f\.collection\.status !== "submitted"/);
  assert.match(source, /state\.role !== "coordinator" \|\| f\.review\.status !== "approved"/);
  assert.match(source, /\["fde", "coordinator"\]\.includes\(state\.role\)/);
  assert.match(source, /f\.incident\.status !== "logged"/);
});

test('collector self-review is absent and a reasoned independent human decision is required', () => {
  assert.match(source, /const allowed = state\.role === "reviewer"/);
  assert.match(source, /현재 역할에는 승인·보완 동작이 제공되지 않습니다/);
  assert.match(source, /수집자는 자신의 기록을 검수할 수 없습니다/);
  assert.match(source, /if \(!reason\) return showToast\("사람의 결정 근거 또는 보완 사유를 입력하세요\."\)/);
  assert.match(source, /AI 결과만으로 승인할 수 없습니다/);
  assert.match(source, /reviewer: "독립 검수자 · 브라우저 데모"/);
});

test('needs-changes creates an explicit recollection boundary before downstream publication', () => {
  assert.match(source, /if \(action === "request-rework"\)[\s\S]*f\.review = \{ status: "rework"/);
  assert.match(source, /f\.collection\.status = "rework"/);
  assert.match(source, /f\.gates\.compensation = false/);
  assert.match(source, /f\.dataset = defaultFieldState\(\)\.dataset/);
  assert.match(source, /보상 조건을 다시 확인해야 합니다/);
});

test('manufacturing-only FDE behavior falls back safely on the small-business field', () => {
  assert.match(source, /const roleAllowed = role => role !== "fde" \|\| state\.field === "manufacturing"/);
  assert.match(source, /if \(!roleAllowed\(state\.role\)\) \{[\s\S]*state\.role = "coordinator"/);
  assert.match(source, /소상공인 MVP에는 현장 적용 전문가 역할이 없어 운영 코디네이터로 전환했습니다/);
  assert.match(source, /if \(state\.field !== "manufacturing"\)[\s\S]*제조 현장에서만 제공되는 흐름입니다/);
  assert.match(source, /\.filter\(\(\[id\]\) => id !== "incident" \|\| state\.field === "manufacturing"\)/);
});

test('restored and direct-link states fail closed instead of creating protected capability', () => {
  assert.match(source, /savedAi\.status === "complete" && \([\s\S]*savedAi\.decisionAuthority !== "human" \|\| !savedAi\.model \|\| !savedAi\.summary/);
  assert.match(source, /savedAi\.status === "loading" \? base\.ai/);
  assert.match(source, /const viewId = renderers\[requested\] \? requested : starts\[state\.role\]/);
  assert.match(source, /roleHasDatasetNavigation/);
  assert.match(source, /deep link는 공개 합성 메타데이터를 읽기 전용으로만 보여 주며 승인·게시 권한을 추가하지 않습니다/);
});

test('rate-limit and incomplete success responses converge on a non-submittable AI error state', () => {
  assert.match(source, /if \(response\.status === 429\)/);
  assert.match(source, /if \(!response\.ok\) throw new Error\(analysisError\(response, payload\)\)/);
  assert.match(source, /const required = \["summary", "task_match", "lighting", "framing", "blur", "privacy_risk", "recommendation", "reason", "recollection_guidance"\]/);
  assert.match(source, /required\.some\(key => typeof payload\.analysis\[key\] !== "string"\)/);
  assert.match(source, /f\.ai = \{ \.\.\.defaultFieldState\(\)\.ai, status: "error", error:/);
  assert.match(source, /ai\.status === "complete" && ai\.decisionAuthority === "human" \? "" : "disabled"/);
});

test('dataset fetch or parse failure stays explicit and retry performs a fresh canonical load', () => {
  assert.match(source, /if \(!response\.ok\) throw new Error\(`\$\{label\}을 불러오지 못했습니다\. \(\$\{response\.status\}\)`\)/);
  assert.match(source, /throw new Error\(`\$\{label\}의 JSON 형식을 확인할 수 없습니다\.`\)/);
  assert.match(source, /datasetExplorer\.data = null;[\s\S]*datasetExplorer\.status = "error"/);
  assert.match(source, /if \(action === "retry-dataset-explorer"\) \{[\s\S]*datasetExplorer\.status = "idle";[\s\S]*datasetExplorer\.error = "";[\s\S]*void loadDatasetExplorer\(\)/);
  assert.match(source, /합성 데이터 탐색기를 표시할 수 없습니다/);
  assert.match(source, /Live API, 생성 완료 또는 승인 학습 데이터로 해석하지 않습니다/);
});
