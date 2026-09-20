import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../public/app.mjs', import.meta.url), 'utf8');
const documentSource = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('collector UI sends image data to the same-origin analysis endpoint', () => {
  assert.match(documentSource, /connect-src 'self'/);
  assert.doesNotMatch(documentSource, /connect-src 'none'/);
  assert.match(source, /fetch\("\/api\/analyze",\s*\{\s*method:\s*"POST"/s);
  assert.match(source, /"Content-Type":\s*"application\/json"/);
  assert.match(source, /JSON\.stringify\(\{\s*imageData,\s*taskContext:/s);
  assert.match(source, /const blob = await response\.blob\(\)/);
  assert.match(source, /reader\.readAsDataURL\(blob\)/);
  assert.match(source, /event\.target\.id === "file-input"[\s\S]*blobToDataUrl\(file\)/);
});

test('raw image data remains memory-only while structured analysis is persisted', () => {
  assert.match(source, /const imageDataByField = \{ manufacturing: "", smallBusiness: "" \}/);
  assert.doesNotMatch(source, /collection:\s*\{[^}]*imageData/s);
  assert.match(source, /const save = \(\) => localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(state\)\)/);
  assert.match(source, /summary:\s*""/);
  assert.match(source, /recollection_guidance:\s*""/);
});

test('success requires human decision authority and renders user-facing bounded result fields', () => {
  assert.match(source, /payload\?\.decisionAuthority !== "human"/);
  assert.match(source, /ai\.status === "complete" && ai\.decisionAuthority === "human"/);
  assert.match(source, /model: payload\.model\.trim\(\)/);
  for (const field of ['summary', 'task_match', 'lighting', 'framing', 'blur', 'privacy_risk', 'recommendation', 'reason', 'recollection_guidance']) {
    assert.match(source, new RegExp(`ai\\.${field}`), `missing rendered ${field}`);
  }
  assert.doesNotMatch(source, /<dt>모델<\/dt>/);
  assert.match(source, /visibleLabel\(ai\.recommendation\)/);
  assert.match(source, /AI는 승인·게시·보상 결정을 하지 않습니다/);
});

test('loading and server failures cannot masquerade as a successful review signal', () => {
  assert.match(source, /status:\s*"loading"/);
  assert.match(source, /status:\s*"error",\s*error:/);
  assert.match(source, /response\.status === 429/);
  assert.match(source, /response\.status === 503/);
  assert.match(source, /response\.status === 502/);
  assert.match(source, /AI 분석 실패:/);
  assert.match(source, /성공 신호가 저장되지 않았으며 독립 검수 제출이 비활성화되었습니다/);
  assert.match(source, /f\.ai\.status !== "complete" \|\| f\.ai\.decisionAuthority !== "human"/);
  assert.doesNotMatch(source, /AI 모델 미연결|로컬 품질 신호|화면 흐름 검증용 로컬 규칙/);
});
