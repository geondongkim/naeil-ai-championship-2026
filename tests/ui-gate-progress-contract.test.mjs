import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../public/app.mjs', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/app.css', import.meta.url), 'utf8');

test('gate progress uses CSP-safe classes and exposes its five-step value', () => {
  assert.doesNotMatch(app, /style\s*=|\.style\b|setAttribute\(\s*["']style["']|cssText/);
  assert.match(app, /role="progressbar"/);
  assert.match(app, /aria-valuemin="0"/);
  assert.match(app, /aria-valuemax="5"/);
  assert.match(app, /aria-valuenow="\$\{count\}"/);
  assert.match(app, /class="progress-\$\{count\}"/);
});

test('stylesheet maps every possible gate count to a bounded width', () => {
  const expectedWidths = ['0', '20%', '40%', '60%', '80%', '100%'];
  expectedWidths.forEach((width, count) => {
    const escapedWidth = width.replace('%', '%');
    assert.match(css, new RegExp(`\\.progress-track > \\.progress-${count} \\{ width: ${escapedWidth}; \\}`));
  });
});
