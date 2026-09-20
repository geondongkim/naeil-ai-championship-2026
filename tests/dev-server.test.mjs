import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { get } from 'node:http';
import { createServer } from 'node:net';
import { once } from 'node:events';

async function reservePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function request(port, path) {
  return new Promise((resolve, reject) => {
    const call = get({ host: '127.0.0.1', port, path }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    call.on('error', reject);
  });
}

async function waitForServer(child) {
  let output = '';
  const started = new Promise((resolve, reject) => {
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
      if (/NAEIL development server:/.test(output)) resolve();
    });
    child.stderr.on('data', (chunk) => { output += chunk.toString(); });
    child.once('exit', (code) => reject(new Error(`development server exited before readiness (${code}): ${output}`)));
  });
  const timeout = new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error(`development server readiness timed out: ${output}`)), 5_000);
    timer.unref();
  });
  await Promise.race([started, timeout]);
}

test('development server serves modules as JavaScript and preserves safety boundaries', async (t) => {
  const port = await reservePort();
  const child = spawn(process.execPath, ['scripts/dev.mjs'], {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (child.exitCode === null) child.kill('SIGTERM');
    if (child.exitCode === null) await once(child, 'exit');
  });
  await waitForServer(child);

  const moduleResponse = await request(port, '/app.mjs');
  assert.equal(moduleResponse.status, 200);
  assert.equal(moduleResponse.headers['content-type'], 'text/javascript; charset=utf-8');
  assert.match(moduleResponse.body, /\S/);

  const traversalResponse = await request(port, '/%2e%2e/package.json');
  assert.equal(traversalResponse.status, 404);

  const apiResponse = await request(port, '/api/analyze');
  assert.equal(apiResponse.status, 405);
  assert.equal(apiResponse.headers.allow, 'POST');
  assert.equal(apiResponse.headers['cache-control'], 'no-store');
});
