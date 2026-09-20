const maxDataUrlCharacters = 3_500_000;
const maxDecodedImageBytes = 2_500_000;
const maxTaskCharacters = 500;
export const defaultModel = 'gpt-5-mini';

export const analysisSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    observed_objects: { type: 'array', items: { type: 'string' } },
    task_match: { type: 'string', enum: ['good', 'review', 'poor'] },
    lighting: { type: 'string', enum: ['good', 'review', 'poor'] },
    framing: { type: 'string', enum: ['good', 'review', 'poor'] },
    blur: { type: 'string', enum: ['good', 'review', 'poor'] },
    privacy_risk: { type: 'string', enum: ['none', 'possible', 'clear'] },
    recommendation: { type: 'string', enum: ['ready_for_human_review', 'human_review', 'retake'] },
    reason: { type: 'string' },
    recollection_guidance: { type: 'string' },
  },
  required: [
    'summary',
    'observed_objects',
    'task_match',
    'lighting',
    'framing',
    'blur',
    'privacy_risk',
    'recommendation',
    'reason',
    'recollection_guidance',
  ],
};

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.end(JSON.stringify(payload));
}

function parseBody(request) {
  if (request.body && typeof request.body === 'object' && !Buffer.isBuffer(request.body)) return request.body;
  const raw = Buffer.isBuffer(request.body) ? request.body.toString('utf8') : String(request.body ?? '');
  return raw ? JSON.parse(raw) : {};
}

function isSameOrigin(request) {
  const origin = request.headers?.origin;
  if (!origin) return true;
  const host = String(request.headers?.['x-forwarded-host'] ?? request.headers?.host ?? '').split(',')[0].trim();
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function parseTaskContext(body) {
  const source = body.taskContext ?? body.task;
  const context = typeof source === 'string' ? { task: source } : source;
  if (!context || typeof context !== 'object' || Array.isArray(context)) return null;
  const task = String(context.task ?? '').trim();
  const field = String(context.field ?? '').trim();
  const role = String(context.role ?? '').trim();
  if (!task || task.length > maxTaskCharacters || field.length > 80 || role.length > 80) return null;
  return { task, field, role };
}

function parseImageData(value) {
  if (typeof value !== 'string') return { errorStatus: 400 };
  if (value.length > maxDataUrlCharacters) return { errorStatus: 413 };
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return { errorStatus: 400 };
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length) return { errorStatus: 400 };
  if (bytes.length > maxDecodedImageBytes) return { errorStatus: 413 };
  const signatures = {
    jpeg: bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
    png: bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    webp: bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP',
  };
  return signatures[match[1]]
    ? { mediaType: match[1], dataUrl: value }
    : { errorStatus: 400 };
}

function outputText(result) {
  if (typeof result?.output_text === 'string') return result.output_text;
  return (result?.output ?? [])
    .flatMap((item) => item?.content ?? [])
    .filter((item) => item?.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('');
}

function isIncomplete(result) {
  return result?.status === 'incomplete'
    || (result?.output ?? []).some((item) => item?.status === 'incomplete');
}

function isValidAnalysis(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort();
  if (keys.join('\0') !== [...analysisSchema.required].sort().join('\0')) return false;
  if (typeof value.summary !== 'string' || !Array.isArray(value.observed_objects) || value.observed_objects.some((item) => typeof item !== 'string')) return false;
  for (const key of ['task_match', 'lighting', 'framing', 'blur', 'privacy_risk', 'recommendation']) {
    if (!analysisSchema.properties[key].enum.includes(value[key])) return false;
  }
  return typeof value.reason === 'string' && typeof value.recollection_guidance === 'string';
}

export function createAnalyzeHandler({
  fetchImpl = globalThis.fetch,
  getApiKey = () => process.env.OPENAI_API_KEY,
  getModel = () => process.env.OPENAI_MODEL || defaultModel,
} = {}) {
  return async function analyze(request, response) {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return sendJson(response, 405, { error: 'POST 요청만 지원합니다.' });
    }
    if (!isSameOrigin(request)) return sendJson(response, 403, { error: '같은 서비스 화면에서만 요청할 수 있습니다.' });
    const contentType = String(request.headers?.['content-type'] ?? '').toLowerCase();
    if (!contentType.startsWith('application/json')) return sendJson(response, 415, { error: 'application/json 요청만 지원합니다.' });

    let body;
    try {
      body = parseBody(request);
    } catch {
      return sendJson(response, 400, { error: '요청 JSON 형식을 확인해 주세요.' });
    }
    const image = parseImageData(body.imageData);
    if (image.errorStatus) {
      return sendJson(response, image.errorStatus, {
        error: image.errorStatus === 413
          ? '이미지가 너무 큽니다. 더 작은 이미지를 보내 주세요.'
          : '크기 제한 안의 JPEG, PNG 또는 WebP data URL을 보내 주세요.',
      });
    }
    const context = parseTaskContext(body);
    if (!context) return sendJson(response, 400, { error: '500자 이하의 작업 맥락을 입력해 주세요.' });

    const apiKey = getApiKey();
    if (!apiKey) return sendJson(response, 503, { error: 'AI 분석 환경이 아직 준비되지 않았습니다.' });
    const model = getModel();
    const prompt = [
      '당신은 NAEIL 현장 데이터의 1차 품질 검수 보조자입니다.',
      `작업: ${context.task}`,
      context.field ? `현장: ${context.field}` : '',
      context.role ? `요청 역할: ${context.role}` : '',
      '이미지에서 직접 확인할 수 있는 정보만 사용하세요.',
      '작업 적합성, 조명, 구도, 흐림, 개인정보 위험을 평가하고 필요하면 재수집 지침을 제안하세요.',
      '사람의 신원이나 민감한 속성을 추정하지 마세요.',
      'AI는 보조 신호만 제공하며 승인, 데이터 공개, 보상 또는 지급 결정을 내릴 수 없습니다.',
      '모든 설명은 간결한 한국어로 작성하세요.',
    ].filter(Boolean).join('\n');

    let upstream;
    try {
      upstream = await fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          store: false,
          reasoning: { effort: 'low' },
          input: [{
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: image.dataUrl, detail: 'low' },
            ],
          }],
          text: {
            format: {
              type: 'json_schema',
              name: 'naeil_field_quality_signal',
              strict: true,
              schema: analysisSchema,
            },
          },
          max_output_tokens: 2_400,
        }),
      });
    } catch {
      return sendJson(response, 502, { error: 'AI 분석 서비스에 연결하지 못했습니다.' });
    }

    if (!upstream.ok) {
      const status = upstream.status === 429 ? 429 : 502;
      return sendJson(response, status, {
        error: status === 429 ? 'AI 분석 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.' : 'AI 분석을 완료하지 못했습니다.',
      });
    }

    let result;
    try {
      result = await upstream.json();
    } catch {
      return sendJson(response, 502, { error: 'AI 분석 결과를 읽지 못했습니다.' });
    }
    if (isIncomplete(result)) {
      return sendJson(response, 502, {
        error: 'AI 분석 응답이 끝까지 생성되지 않았습니다. 잠시 후 다시 시도해 주세요.',
        code: 'AI_RESPONSE_INCOMPLETE',
        retryable: true,
      });
    }

    try {
      const analysis = JSON.parse(outputText(result));
      if (!isValidAnalysis(analysis)) throw new Error('invalid structured response');
      return sendJson(response, 200, { analysis, model: result.model ?? model, decisionAuthority: 'human' });
    } catch {
      return sendJson(response, 502, { error: 'AI 분석 결과를 읽지 못했습니다.' });
    }
  };
}

export default createAnalyzeHandler();
