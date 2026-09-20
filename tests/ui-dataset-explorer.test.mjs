import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  filterDatasetObservations,
  paginateDatasetObservations,
  validateDatasetExplorerArtifacts,
} from '../public/app.mjs';

const root = new URL('../', import.meta.url);
const appSource = await readFile(new URL('../public/app.mjs', import.meta.url), 'utf8');
const cssSource = await readFile(new URL('../public/app.css', import.meta.url), 'utf8');

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), 'utf8'));
}

const [coverage, observations, queue] = await Promise.all([
  readJson('public/data/dataset-coverage.json'),
  readJson('public/data/synthetic-observations.json'),
  readJson('public/data/image-generation-queue.json'),
]);

test('dataset explorer loads only the three same-origin canonical artifacts', () => {
  for (const path of [
    './data/dataset-coverage.json',
    './data/synthetic-observations.json',
    './data/image-generation-queue.json',
  ]) {
    assert.match(appSource, new RegExp(path.replaceAll('.', '\\.')));
  }
  assert.match(appSource, /fetch\(path, \{ cache: "no-store" \}\)/);
  assert.doesNotMatch(appSource, /fetch\(["']https?:\/\//);
  assert.doesNotMatch(appSource, /sourceType\s*:\s*["']Live API["']/);
});

test('canonical totals are validated and rendered from loaded data rather than UI literals', () => {
  assert.deepEqual(validateDatasetExplorerArtifacts(coverage, observations, queue), { coverage, observations, queue });
  assert.equal(coverage.canonicalCounts.observations, 120);
  assert.equal(coverage.canonicalCounts.scenarios, 12);
  assert.equal(coverage.canonicalCounts.imageGenerationCompletions, 8);
  assert.equal(coverage.plannedImageCoverage.plannedNotGeneratedCount, 28);
  for (const expression of [
    'coverage.canonicalCounts.observations',
    'coverage.canonicalCounts.scenarios',
    'coverage.canonicalCounts.imageGenerationCompletions',
    'coverage.plannedImageCoverage.plannedNotGeneratedCount',
  ]) {
    assert.ok(appSource.includes(expression), `missing canonical rendered value ${expression}`);
  }

  const invalidCoverage = structuredClone(coverage);
  invalidCoverage.canonicalCounts.observations += 1;
  assert.throws(
    () => validateDatasetExplorerArtifacts(invalidCoverage, observations, queue),
    /집계가 일치하지 않습니다/,
  );
});

test('field, scenario, and issue filters compose without mutating canonical observations', () => {
  const originalFirst = structuredClone(observations.records[0]);
  const manufacturing = filterDatasetObservations(observations.records, { field: 'manufacturing' });
  const smallBusiness = filterDatasetObservations(observations.records, { field: 'small-business' });
  assert.equal(manufacturing.length, 60);
  assert.equal(smallBusiness.length, 60);

  const target = manufacturing.find((record) => record.issueCodes.some((code) => code !== 'normal'));
  const issueCode = target.issueCodes.find((code) => code !== 'normal');
  const combined = filterDatasetObservations(observations.records, {
    field: 'manufacturing',
    scenarioId: target.scenarioId,
    issueCode,
  });
  assert.ok(combined.length > 0);
  assert.ok(combined.every((record) => record.field === 'manufacturing'));
  assert.ok(combined.every((record) => record.scenarioId === target.scenarioId));
  assert.ok(combined.every((record) => record.issueCodes.includes(issueCode)));
  assert.deepEqual(observations.records[0], originalFirst);
  assert.deepEqual(filterDatasetObservations(observations.records, {
    field: 'manufacturing',
    scenarioId: 'missing-synthetic-scenario',
    issueCode,
  }), []);
});

test('observation output is capped and paginated for mobile-safe rendering', () => {
  const manufacturing = filterDatasetObservations(observations.records, { field: 'manufacturing' });
  const first = paginateDatasetObservations(manufacturing, 1, 12);
  const last = paginateDatasetObservations(manufacturing, 99, 12);
  assert.equal(first.items.length, 12);
  assert.equal(first.totalItems, 60);
  assert.equal(first.totalPages, 5);
  assert.equal(last.page, 5);
  assert.equal(last.items.length, 12);
  assert.ok(first.items.every((record) => record.field === 'manufacturing'));
  assert.match(cssSource, /\.dataset-observation-table \{ min-width: 820px; \}/);
  assert.match(cssSource, /@media \(max-width: 760px\)[\s\S]*\.dataset-observation-table \{ min-width: 0; \}/);
});

test('downloads and loading, parse-fetch error, and empty-filter states remain explicitly synthetic', () => {
  assert.match(appSource, /download>\$\{escapeHtml\(label\)\} 다운로드<\/a>/);
  assert.match(appSource, /합성 데이터 원본/);
  assert.match(appSource, /합성 데이터 탐색기를 불러오는 중입니다/);
  assert.match(appSource, /합성 데이터 탐색기를 표시할 수 없습니다/);
  assert.match(appSource, /선택한 조건에 맞는 합성 관찰값이 없습니다/);
  assert.match(appSource, /로딩 상태는 실제 연동 또는 승인 데이터 상태가 아닙니다/);
  assert.match(appSource, /서버 내보내기, 영구 저장 또는 실제 연동이 아닙니다/);
  assert.match(appSource, /syntheticSourceLabel/);
  assert.match(appSource, /프로젝트 시연 범위/);
  assert.match(appSource, /coverage\.usageBoundary/);
});

test('dataset explorer adds no navigation or protected action to the collector role', () => {
  assert.match(appSource, /collector:\s*\[\["collect"[\s\S]*?\["career", "경력 증거"\]\]/);
  assert.doesNotMatch(appSource, /collector:\s*\[[^\n]*\["dataset"/);
  assert.match(appSource, /roleHasDatasetNavigation/);
  assert.match(appSource, /읽기 전용으로만 보여 주며 승인·게시 권한을 추가하지 않습니다/);
});
