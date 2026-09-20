import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../public/app.css', import.meta.url), 'utf8');
const app = await readFile(new URL('../public/app.mjs', import.meta.url), 'utf8');

test('visual system self-hosts Pretendard and preserves a system fallback', () => {
  assert.match(css, /@font-face\s*{[\s\S]*font-family:\s*"Pretendard"/);
  assert.match(css, /PretendardVariable\.woff2/);
  assert.match(css, /font-family:\s*Pretendard,[\s\S]*system-ui/);
});

test('home has one action-led h1 instead of a duplicate page heading', () => {
  const homeSource = app.slice(app.indexOf('function renderHome()'), app.indexOf('function flowSteps()'));
  assert.doesNotMatch(homeSource, /pageHead\(/);
  assert.match(homeSource, /class="hero home-hero"/);
  assert.match(homeSource, /<h1>\$\{roleCopy\[0\]\}<\/h1>/);
  assert.match(homeSource, /hero-role-summary/);
});

test('work, review, dataset, and career views expose visual context without changing authority', () => {
  assert.match(app, /class="scope-preview"/);
  assert.match(app, /class="empty review-empty"/);
  assert.match(app, /class="dataset-spotlight"/);
  assert.match(app, /class="career-intro"/);
  assert.match(app, /AI 생성 합성 예시/);
  assert.match(app, /수집자는 자신의 기록을 검수할 수 없습니다/);
});

test('visible presentation copy avoids decorative English, raw model names, and version strings', () => {
  const html = app.match(/function renderHome\(\)[\s\S]*?const renderers/)?.[0] || '';
  for (const phrase of ['ONE PRODUCT', 'LIVE BROWSER STATE', 'SESSION STATE', 'LIVE API SIGNAL', 'PROVENANCE', 'CAREER EVIDENCE']) {
    assert.doesNotMatch(html, new RegExp(phrase));
  }
  assert.doesNotMatch(html, /<dt>모델<\/dt>|dataset\.version|d\.version|현재\(\)\.dataset\.version/);
  assert.match(html, /syntheticSourceLabel/);
  assert.match(html, /검수 결과 게시/);
});
