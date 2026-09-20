import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { simulationBoundary, simulationCatalog } from '../public/app.mjs';

const source = await readFile(new URL('../public/app.mjs', import.meta.url), 'utf8');
const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

const expectedIds = [
  'robot-control',
  'model-training',
  'youth-placement',
  'business-outcomes',
  'partner-data',
];

test('both fields expose five rich synthetic expansion scenarios', () => {
  const codes = new Set();
  for (const field of ['manufacturing', 'smallBusiness']) {
    const items = simulationCatalog[field];
    assert.equal(items.length, 5);
    assert.deepEqual(items.map(({ id }) => id), expectedIds);
    for (const item of items) {
      assert.match(item.code, /^SIM-(?:MFG|SMB)-[A-Z]{3}-01$/);
      assert.ok(item.title.length >= 8);
      assert.ok(item.summary.length >= 20);
      assert.ok(item.metric.length >= 8);
      assert.equal(item.mockRows.length, 5);
      assert.ok(item.mockRows.every(row => row.length === 3));
      assert.equal(item.mockRows.flat().length, 15);
      assert.ok(item.mockRows.flat().every(fact => fact.length >= 5));
      assert.equal(new Set(item.mockRows.map(([segment]) => segment)).size, 5);
      assert.ok(item.reason.length >= 30);
      assert.ok(item.requirement.length >= 30);
      assert.equal(codes.has(item.code), false);
      codes.add(item.code);
    }
  }
  assert.equal(codes.size, 10);
});

test('attempt boundary stays synthetic, non-executable, and state neutral', () => {
  for (const field of ['manufacturing', 'smallBusiness']) {
    for (const id of expectedIds) {
      const boundary = simulationBoundary(field, id);
      assert.equal(boundary.sourceType, 'AI-generated synthetic example');
      assert.equal(boundary.implemented, false);
      assert.equal(boundary.changesProductState, false);
    }
  }
  assert.equal(simulationBoundary('manufacturing', 'unknown'), null);
  assert.equal(simulationBoundary('unknown', 'robot-control'), null);
});

test('detailed mock and implementation notice appears only from an execution attempt', () => {
  assert.match(source, /button\(item\.actionLabel, "open-simulation-boundary"/);
  assert.match(source, /if \(action === "open-simulation-boundary"\) \{[\s\S]*showSimulationBoundary[\s\S]*return;/);
  assert.match(source, /제품 흐름 확인용 목데이터입니다/);
  assert.match(source, /dialog\.showModal/);
  assert.match(html, /id="simulation-boundary-dialog"/);
  assert.match(html, /현재 실행하지 않는 이유/);
  assert.match(html, /실제 연결에 필요한 조건/);
  assert.match(html, /제품 상태를 변경하지 않으며 외부 장비·학습·채용·계약·데이터 시스템을 호출하지 않습니다/);
});

test('simulation lab is limited to planning roles and keeps the source label visible', () => {
  assert.match(source, /if \(!\["coordinator", "fde"\]\.includes\(state\.role\)\) return ""/);
  assert.match(source, /badge\("AI-generated synthetic example"\)/);
  assert.match(source, /확장 운영 시뮬레이션/);
  assert.match(source, /필드별 75개, 총 150개 합성 운영값/);
  assert.match(source, /상세 목데이터 15개 보기/);
});
