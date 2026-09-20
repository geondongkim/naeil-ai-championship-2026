import test from 'node:test';
import assert from 'node:assert/strict';
import { analysisSchema, createAnalyzeHandler, defaultModel } from '../api/analyze.mjs';

const pngDataUrl = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]).toString('base64')}`;
const validAnalysis = {
  summary: '작업 대상이 보입니다.',
  observed_objects: ['작업 대상'],
  task_match: 'good',
  lighting: 'review',
  framing: 'good',
  blur: 'good',
  privacy_risk: 'none',
  recommendation: 'ready_for_human_review',
  reason: '사람 검수가 필요합니다.',
  recollection_guidance: '필요하면 밝기를 높여 다시 촬영하세요.',
};

async function invoke(handler, {
  method = 'POST',
  headers = { host: 'naeil.test', origin: 'https://naeil.test', 'content-type': 'application/json' },
  body = { imageData: pngDataUrl, taskContext: { task: '현장 품질 확인', field: 'manufacturing', role: 'collector' } },
} = {}) {
  let payload;
  const responseHeaders = new Map();
  const response = {
    statusCode: 200,
    setHeader(name, value) { responseHeaders.set(name.toLowerCase(), value); },
    end(content) { payload = JSON.parse(content); },
  };
  await handler({ method, headers, body }, response);
  return { status: response.statusCode, headers: responseHeaders, payload };
}

test('schema is strict and cannot approve or pay work', () => {
  assert.equal(defaultModel, 'gpt-5-mini');
  assert.equal(analysisSchema.additionalProperties, false);
  assert.deepEqual(new Set(analysisSchema.required), new Set(Object.keys(analysisSchema.properties)));
  assert.deepEqual(analysisSchema.properties.recommendation.enum, ['ready_for_human_review', 'human_review', 'retake']);
  assert.doesNotMatch(JSON.stringify(analysisSchema), /payment|payout|approved/i);
});

test('endpoint is POST-only, same-origin, JSON-only and no-store', async () => {
  const handler = createAnalyzeHandler({ getApiKey: () => '' });
  const method = await invoke(handler, { method: 'GET', headers: {} });
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('allow'), 'POST');
  assert.equal(method.headers.get('cache-control'), 'no-store');

  const origin = await invoke(handler, { headers: { host: 'naeil.test', origin: 'https://outside.test', 'content-type': 'application/json' } });
  assert.equal(origin.status, 403);

  const media = await invoke(handler, { headers: { host: 'naeil.test', origin: 'https://naeil.test', 'content-type': 'text/plain' } });
  assert.equal(media.status, 415);
});

test('request validation rejects malformed JSON, invalid image bytes and task context', async () => {
  const handler = createAnalyzeHandler({ getApiKey: () => '' });
  assert.equal((await invoke(handler, { body: Buffer.from('{') })).status, 400);
  assert.equal((await invoke(handler, { body: { imageData: 'data:image/png;base64,ZmFrZQ==', task: '검수' } })).status, 400);
  assert.equal((await invoke(handler, { body: { imageData: pngDataUrl, taskContext: {} } })).status, 400);
  assert.equal((await invoke(handler, { body: { imageData: `data:image/png;base64,${'A'.repeat(3_500_001)}`, task: '검수' } })).status, 413);
});

test('missing server key returns 503 without making a paid call', async () => {
  let calls = 0;
  const handler = createAnalyzeHandler({
    getApiKey: () => '',
    fetchImpl: async () => { calls += 1; throw new Error('must not call'); },
  });
  const result = await invoke(handler);
  assert.equal(result.status, 503);
  assert.equal(calls, 0);
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('mocked Responses call uses strict schema and returns a human-only signal', async () => {
  let request;
  const handler = createAnalyzeHandler({
    getApiKey: () => 'test-only-key',
    getModel: () => 'test-model',
    fetchImpl: async (url, init) => {
      request = { url, init, body: JSON.parse(init.body) };
      return { ok: true, status: 200, json: async () => ({ model: 'test-model', output_text: JSON.stringify(validAnalysis) }) };
    },
  });
  const result = await invoke(handler);
  assert.equal(result.status, 200);
  assert.equal(result.payload.decisionAuthority, 'human');
  assert.deepEqual(result.payload.analysis, validAnalysis);
  assert.equal(request.url, 'https://api.openai.com/v1/responses');
  assert.equal(request.body.store, false);
  assert.deepEqual(request.body.reasoning, { effort: 'low' });
  assert.equal(request.body.max_output_tokens, 2_400);
  assert.equal(request.body.text.format.strict, true);
  assert.deepEqual(request.body.text.format.schema, analysisSchema);
  assert.match(request.body.input[0].content[0].text, /승인, 데이터 공개, 보상 또는 지급 결정을 내릴 수 없습니다/);
});

test('upstream and invalid structured response errors are bounded without fallback approval', async () => {
  const unavailable = createAnalyzeHandler({
    getApiKey: () => 'test-only-key',
    fetchImpl: async () => { throw new Error('offline'); },
  });
  assert.equal((await invoke(unavailable)).status, 502);

  const limited = createAnalyzeHandler({
    getApiKey: () => 'test-only-key',
    fetchImpl: async () => ({ ok: false, status: 429 }),
  });
  assert.equal((await invoke(limited)).status, 429);

  const malformed = createAnalyzeHandler({
    getApiKey: () => 'test-only-key',
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ output_text: '{}' }) }),
  });
  const result = await invoke(malformed);
  assert.equal(result.status, 502);
  assert.equal('analysis' in result.payload, false);
});

test('incomplete Responses output returns a clear retryable error', async () => {
  const handler = createAnalyzeHandler({
    getApiKey: () => 'test-only-key',
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'incomplete',
        incomplete_details: { reason: 'max_output_tokens' },
        output: [{ type: 'message', status: 'incomplete', content: [] }],
      }),
    }),
  });
  const result = await invoke(handler);
  assert.equal(result.status, 502);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(result.payload.code, 'AI_RESPONSE_INCOMPLETE');
  assert.equal(result.payload.retryable, true);
  assert.match(result.payload.error, /다시 시도/);
  assert.equal('analysis' in result.payload, false);
});
