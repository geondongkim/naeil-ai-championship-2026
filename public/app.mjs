const STORAGE_KEY = "naeil.cleanroom.ui.v1";

const fields = {
  manufacturing: {
    name: "제조 현장",
    short: "제조",
    taskId: "MF-DEMO-01",
    task: "정밀 부품 외관 데이터 수집",
    site: "모의 정밀 작업 셀",
    data: "RGB 이미지 · 촬영 조건 메타데이터",
    scope: "정지된 샘플 부품과 지정 배경만 기록",
    incident: "조명 변화로 인한 외관 판정 신뢰 저하",
  },
  smallBusiness: {
    name: "소상공인 현장",
    short: "소상공인",
    taskId: "SB-DEMO-01",
    task: "마감 시간 식기 분류 동작 기록",
    site: "합성 식음 매장 작업 구역",
    data: "짧은 작업 영상 · 구간 라벨",
    scope: "고객이 없는 구역의 빈 식기와 트레이만 기록",
    incident: "",
  },
};

const roles = {
  requester: { name: "요청자", summary: "필요한 데이터와 이용 목적을 정의합니다." },
  provider: { name: "현장 제공자", summary: "동의·제한 구역·현장 조건을 관리합니다." },
  collector: { name: "데이터 오퍼레이터", summary: "교육과 허용 범위를 확인하고 현장을 기록합니다." },
  reviewer: { name: "품질·안전 검수자", summary: "수집자와 분리해 품질·권리 위험을 판단합니다." },
  coordinator: { name: "운영 코디네이터", summary: "배정·검수·권리 상태를 분리해 조율합니다." },
  fde: { name: "현장 적용 전문가", summary: "제조 실패를 재수집 과제로 연결합니다." },
};

const gateDefinitions = [
  ["consent", "현장 동의", "제한 구역과 기록 가능 범위를 현장 제공자가 확인"],
  ["training", "필수 교육", "작업·개인정보·기기 안전 안내를 확인"],
  ["safety", "안전 조건", "감독 방법과 중단 기준을 확인"],
  ["scope", "허용 작업 범위", "대상·시간·데이터 종류를 과제와 일치시킴"],
  ["compensation", "보상 조건 확인", "작업 시간과 보완 작업 조건을 사전에 확인"],
];

const careerPaths = [
  ["현장 데이터 코디네이터", "동의·일정·제한 구역과 수집 범위를 조율", "01"],
  ["Physical AI 데이터 오퍼레이터", "과제 표준에 따라 이미지·영상·센서 기록", "02"],
  ["품질·안전 검수자", "품질·개인정보·안전 위험을 독립적으로 검토", "03"],
  ["데이터 권리 관리자", "목적·보존·재사용·철회 조건을 관리", "04"],
  ["현장 적용 전문가", "통제된 현장에서 버전·조건·사고를 연결", "05"],
  ["재수집 운영자", "실패 원인을 범위가 정해진 새 과제로 변환", "06"],
];

const navByRole = {
  requester: [["task", "과제 정의"], ["dataset", "데이터셋·이용"]],
  provider: [["task", "현장 조건"], ["dataset", "권리 조건"]],
  collector: [["collect", "나의 작업"], ["task", "준비 조건"], ["ai-review", "AI 보조검수"], ["career", "경력 증거"]],
  reviewer: [["review", "독립 검수"], ["dataset", "버전·출처"], ["career", "검수 증거"]],
  coordinator: [["home", "운영 개요"], ["task", "과제·배정"], ["review", "검수 상태"], ["dataset", "데이터셋·권리"], ["career", "직무 증거"], ["incident", "사고·재수집"]],
  fde: [["incident", "사고·재수집"], ["dataset", "버전·출처"], ["career", "현장 경험"]],
};

const starts = { requester: "task", provider: "task", collector: "collect", reviewer: "review", coordinator: "home", fde: "incident" };
const navIcons = {
  home: "M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z",
  task: "M7 4h10v3H7zm-2 2h14v15H5zm3 5h8m-8 4h8",
  collect: "M4 7h16v12H4zm4-3h8v3H8zm0 7h8m-8 4h5",
  "ai-review": "M12 3v3m-6.4.6 2.1 2.1M3 13h3m12 0h3m-4.6-6.4-2.1 2.1M8 18h8l1-5a5 5 0 1 0-10 0z",
  review: "M5 4h14v16H5zm4 4h6m-6 4h6m-6 4h3M3 9l1 1 2-3",
  dataset: "M4 6c0 2 16 2 16 0s-16-2-16 0v12c0 2 16 2 16 0V6M4 12c0 2 16 2 16 0",
  career: "M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0zm-3 14v-2a7 7 0 0 1 14 0v2",
  incident: "M12 3 2.8 20h18.4zM12 9v5m0 3v.1",
};

const defaultFieldState = () => ({
  gates: Object.fromEntries(gateDefinitions.map(([key]) => [key, false])),
  collection: { status: "idle", source: "", fileName: "", records: 0, note: "", submittedBy: "" },
  ai: {
    status: "notRun",
    model: "",
    decisionAuthority: "",
    summary: "",
    task_match: "",
    lighting: "",
    framing: "",
    blur: "",
    privacy_risk: "",
    recommendation: "",
    reason: "",
    recollection_guidance: "",
    error: "",
  },
  review: { status: "waiting", reason: "", reviewer: "" },
  dataset: { status: "draft", version: "v0.1-draft", access: "notRequested" },
  incident: { status: "none", description: "", recollectionId: "" },
});

const defaultState = () => ({
  field: "manufacturing",
  role: "coordinator",
  fields: { manufacturing: defaultFieldState(), smallBusiness: defaultFieldState() },
});

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const base = defaultState();
    if (!saved || typeof saved !== "object") return base;
    return {
      ...base,
      ...saved,
      fields: {
        manufacturing: mergeField(base.fields.manufacturing, saved.fields?.manufacturing),
        smallBusiness: mergeField(base.fields.smallBusiness, saved.fields?.smallBusiness),
      },
    };
  } catch { return defaultState(); }
}

function mergeField(base, saved = {}) {
  const savedAi = { ...base.ai, ...saved.ai };
  const ai = savedAi.status === "complete" && (
    savedAi.decisionAuthority !== "human" || !savedAi.model || !savedAi.summary
  ) ? base.ai : savedAi.status === "loading" ? base.ai : savedAi;
  return {
    ...base,
    ...saved,
    gates: { ...base.gates, ...saved.gates },
    collection: { ...base.collection, ...saved.collection },
    ai,
    review: { ...base.review, ...saved.review },
    dataset: { ...base.dataset, ...saved.dataset },
    incident: { ...base.incident, ...saved.incident },
  };
}

let state = loadState();
let previewUrl = "";
const imageDataByField = { manufacturing: "", smallBusiness: "" };
let toastTimer;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const current = () => state.fields[state.field];
const field = () => fields[state.field];
const allGates = () => gateDefinitions.every(([key]) => current().gates[key]);
const gateCount = () => gateDefinitions.filter(([key]) => current().gates[key]).length;
const roleAllowed = role => role !== "fde" || state.field === "manufacturing";
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const syntheticAsset = () => state.field === "manufacturing" ? "./assets/manufacturing-inspection-synthetic.png" : "./assets/cafe-cup-sorting-synthetic.png";
const syntheticAlt = () => state.field === "manufacturing" ? "정밀 부품 외관을 검사하는 AI 생성 합성 예시" : "카페에서 컵과 트레이를 정리하는 AI 생성 합성 예시";

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("이미지 데이터를 읽을 수 없습니다.")));
    reader.addEventListener("error", () => reject(new Error("이미지 파일을 읽을 수 없습니다.")));
    reader.readAsDataURL(blob);
  });
}

async function loadSyntheticImageData() {
  const response = await fetch(syntheticAsset(), { cache: "no-store" });
  if (!response.ok) throw new Error("내장 합성 예시를 불러오지 못했습니다.");
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("내장 합성 예시의 형식이 올바르지 않습니다.");
  const imageData = await blobToDataUrl(blob);
  imageDataByField[state.field] = imageData;
  return imageData;
}

function analysisError(response, payload) {
  if (typeof payload?.error === "string" && payload.error.trim()) return payload.error.trim();
  if (response.status === 429) return "AI 분석 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.";
  if (response.status === 503) return "AI 분석 환경이 아직 준비되지 않았습니다.";
  if (response.status === 502) return "AI 분석 서비스 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.";
  if (response.status === 413) return "이미지가 분석 요청 한도를 초과했습니다.";
  return `AI 분석 요청에 실패했습니다. (${response.status})`;
}

function validatedAnalysis(payload) {
  if (payload?.decisionAuthority !== "human") {
    throw new Error("사람의 최종 판단 권한을 확인할 수 없어 결과를 사용할 수 없습니다.");
  }
  const required = ["summary", "task_match", "lighting", "framing", "blur", "privacy_risk", "recommendation", "reason", "recollection_guidance"];
  if (typeof payload.model !== "string" || !payload.model.trim() || !payload.analysis || required.some(key => typeof payload.analysis[key] !== "string")) {
    throw new Error("AI 분석 응답 형식이 올바르지 않습니다.");
  }
  return {
    status: "complete",
    model: payload.model.trim(),
    decisionAuthority: "human",
    ...Object.fromEntries(required.map(key => [key, payload.analysis[key]])),
    error: "",
  };
}

async function runAiAnalysis() {
  const f = current();
  f.ai = { ...defaultFieldState().ai, status: "loading" };
  save();
  render();
  try {
    let imageData = imageDataByField[state.field];
    if (!imageData && f.collection.source === "synthetic") imageData = await loadSyntheticImageData();
    if (!imageData && f.collection.source === "upload") {
      throw new Error("새로고침 뒤에는 선택 이미지가 남지 않습니다. 파일을 다시 선택해 주세요.");
    }
    if (!imageData) throw new Error("분석할 이미지를 먼저 선택해 주세요.");
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageData,
        taskContext: { task: field().task, field: state.field, role: state.role },
      }),
    });
    let payload = null;
    try { payload = await response.json(); } catch { /* bounded fallback below */ }
    if (!response.ok) throw new Error(analysisError(response, payload));
    f.ai = validatedAnalysis(payload);
    showToast("AI 보조 분석을 받았습니다. 사람의 독립 검수가 필요합니다.");
  } catch (error) {
    f.ai = { ...defaultFieldState().ai, status: "error", error: error instanceof Error ? error.message : "AI 분석 요청에 실패했습니다." };
    showToast("AI 분석을 완료하지 못했습니다. 검수 제출은 비활성 상태입니다.");
  }
  save();
  render();
}

function icon(name) {
  return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${navIcons[name] || navIcons.home}"/></svg>`;
}

function badge(text, tone = "neutral") { return `<span class="badge ${tone}">${escapeHtml(text)}</span>`; }
function button(text, action, tone = "secondary", attrs = "") { return `<button class="button ${tone}" type="button" data-action="${action}" ${attrs}>${escapeHtml(text)}</button>`; }
function pageHead(kicker, title, copy, actions = "") {
  return `<header class="page-head"><div><p class="eyebrow">${escapeHtml(kicker)}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(copy)}</p></div>${actions ? `<div class="page-actions">${actions}</div>` : ""}</header>`;
}
function notice(text, tone = "") { return `<div class="notice ${tone}">${text}</div>`; }

function updateRoleOptions() {
  const select = $("#role-select");
  select.innerHTML = Object.entries(roles).filter(([id]) => roleAllowed(id)).map(([id, role]) => `<option value="${id}" ${id === state.role ? "selected" : ""}>${role.name}</option>`).join("");
}

function updateShell(viewId) {
  $("#field-select").value = state.field;
  updateRoleOptions();
  $("#context-title").textContent = field().name;
  $("#context-role").textContent = roles[state.role].name;
  const items = [["home", "역할 홈"], ...(navByRole[state.role] || [])].filter((item, index, array) => array.findIndex(([id]) => id === item[0]) === index);
  $("#primary-nav").innerHTML = items
    .filter(([id]) => id !== "incident" || state.field === "manufacturing")
    .map(([id, label]) => `<a class="nav-link" href="#${id}" ${id === viewId ? 'aria-current="page"' : ""}>${icon(id)}<span>${escapeHtml(label)}</span></a>`).join("");
}

function renderHome() {
  const f = field();
  const roleCopy = {
    requester: ["필요한 현장 데이터를 명확하게 정의하세요", "목적과 허용 범위가 분리된 과제에서 시작합니다.", "과제 정의 보기", "task"],
    provider: ["현장 조건과 기록 권리를 먼저 지키세요", "동의·제한 구역·안전 조건이 수집보다 앞섭니다.", "현장 조건 확인", "task"],
    collector: ["안전하게 기록하고 검증 가능한 경험을 남기세요", "다섯 조건이 모두 확인된 작업만 수집할 수 있습니다.", "나의 작업 열기", "collect"],
    reviewer: ["사람의 독립 판단으로 데이터 품질을 확정하세요", "AI 신호는 참고일 뿐 승인 결정을 대신하지 않습니다.", "검수 대기 열기", "review"],
    coordinator: ["한 현장의 요청부터 권리 있는 데이터셋까지 연결하세요", "수집·검수·접근·보상 상태를 서로 다른 축으로 관리합니다.", "과제 상태 보기", "task"],
    fde: ["현장 실패를 추적 가능한 재수집으로 바꾸세요", "버전·조건·사고 원인을 새 과제 범위에 연결합니다.", "사고 흐름 열기", "incident"],
  }[state.role];
  const metrics = [
    ["준비 조건", `${gateCount()}/5`, allGates() ? "수집 가능" : "수집 전 확인"],
    ["수집 상태", statusLabel(current().collection.status), `${current().collection.records}개 기록`],
    ["사람 검수", reviewLabel(current().review.status), "AI와 분리"],
    ["데이터 버전", current().dataset.version, datasetLabel(current().dataset.status)],
  ];
  return `${pageHead(`${f.short.toUpperCase()} FIELD · ${roles[state.role].name}`, `${f.name} 역할 홈`, roles[state.role].summary)}
    <section class="hero"><div class="hero-copy"><p class="eyebrow">ONE PRODUCT · TWO FIELDS</p><h2>${roleCopy[0]}</h2><p>${roleCopy[1]}</p><div class="hero-actions"><a class="button primary" href="#${roleCopy[3]}">${roleCopy[2]}</a><a class="button secondary" href="#career">신직무 경로 보기</a></div></div><figure class="hero-visual"><img src="${syntheticAsset()}" alt="${syntheticAlt()}"><figcaption>AI-generated synthetic example · 실제 수집/승인 학습 데이터 아님</figcaption></figure></section>
    <section class="section"><div class="section-heading"><div><p class="eyebrow">LIVE BROWSER STATE</p><h2>현재 데모 흐름</h2></div><p>이 브라우저의 localStorage에만 저장됩니다.</p></div><div class="grid four">${metrics.map(([label, value, detail]) => `<article class="card compact metric"><span>${label}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></article>`).join("")}</div></section>
    <section class="section card"><div class="section-heading"><div><p class="eyebrow">LIFECYCLE</p><h2>요청에서 재수집까지</h2></div></div>${flowSteps()}</section>`;
}

function flowSteps() {
  return `<ol class="flow-steps">${[
    ["요청·범위", "목적과 현장 조건"], ["준비·수집", "다섯 gate"], ["AI 신호", "승인 권한 없음"], ["사람 검수", "독립 결정·사유"], ["권리·재수집", "버전과 실패 연결"],
  ].map(([title, detail], index) => `<li><span class="step-no">${index + 1}</span><strong>${title}</strong><span>${detail}</span></li>`).join("")}</ol>`;
}

function canToggleGate(key) {
  const access = {
    requester: ["scope"], provider: ["consent", "safety", "scope"], collector: ["training", "safety", "compensation"], reviewer: [], coordinator: gateDefinitions.map(([id]) => id), fde: [],
  };
  return access[state.role].includes(key);
}

function renderTask() {
  const f = field();
  const count = gateCount();
  const actions = state.role === "collector" ? `<a class="button primary" href="#collect">수집 작업으로</a>` : state.role === "requester" ? button("과제 범위 확인", "confirm-request", "primary") : "";
  return `${pageHead("TASK & READINESS", f.task, "다섯 조건은 수집 시작 전 모두 명시적으로 확인되어야 합니다.", actions)}
    <div class="grid main-side"><section class="card"><div class="card-top"><div><p class="eyebrow">${f.taskId}</p><h2>준비 상태</h2></div>${badge(`${count}/5 확인`, count === 5 ? "green" : "amber")}</div><p>${escapeHtml(f.scope)}</p><div class="progress-track" role="progressbar" aria-label="준비 조건 진행률" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${count}"><span class="progress-${count}"></span></div><div class="gate-list">${gateDefinitions.map(([key, title, detail], index) => `<label class="gate-row"><span class="gate-index">${index + 1}</span><span><strong>${title}</strong><small>${detail}</small></span><input type="checkbox" data-gate="${key}" ${current().gates[key] ? "checked" : ""} ${canToggleGate(key) ? "" : "disabled"} aria-describedby="gate-help-${key}"><span id="gate-help-${key}" hidden>${canToggleGate(key) ? "현재 역할이 확인할 수 있습니다." : "다른 역할의 확인이 필요합니다."}</span></label>`).join("")}</div></section>
    <aside class="grid"><section class="card tint"><p class="eyebrow">SCOPE</p><h2>현장·데이터 경계</h2><dl class="definition-list"><dt>현장</dt><dd>${escapeHtml(f.site)}</dd><dt>데이터</dt><dd>${escapeHtml(f.data)}</dd><dt>허용 범위</dt><dd>${escapeHtml(f.scope)}</dd><dt>출처 상태</dt><dd>AI-generated synthetic example</dd></dl></section>${notice(`현재 역할은 <strong>${roles[state.role].name}</strong>입니다. 비활성 gate는 담당 역할로 전환해야 확인할 수 있습니다.`, "warning")}</aside></div>`;
}

function renderCollect() {
  const c = current().collection;
  const allowed = state.role === "collector";
  const ready = allGates();
  const preview = previewUrl || (c.source === "synthetic" ? syntheticAsset() : "");
  return `${pageHead("COLLECTOR WORKSPACE", "허용된 범위만 기록합니다", `${field().task} · 수집과 검수는 서로 다른 역할입니다.`, `<a class="button secondary" href="#task">5개 조건 확인</a>`)}
    ${!allowed ? notice("현재 역할에는 수집·파일 선택·제출 동작이 제공되지 않습니다. 데이터 오퍼레이터로 전환하세요.", "danger") : ""}
    <div class="grid main-side"><section class="card"><div class="card-top"><div><p class="eyebrow">SYNTHETIC CAPTURE AREA</p><h2>대표 입력 장면</h2></div>${badge(c.source === "synthetic" ? "AI-generated synthetic example" : "입력 대기", c.source ? "green" : "neutral")}</div>
    <div class="workspace-preview">${preview ? `<img src="${escapeHtml(preview)}" alt="${c.source === "synthetic" ? syntheticAlt() : "사용자가 선택한 브라우저 임시 이미지 미리보기"}">` : `<div class="workspace-object"><img src="./assets/synthetic-workcell.svg" alt="실제 현장이 아닌 기하학 도형 기반 합성 작업대"><span>기록할 이미지를 선택하세요</span></div>`}</div>
    ${allowed ? `<div class="actions">${button("내장 합성 예시 사용", "use-synthetic", "secondary", ready ? "" : "disabled")}<label class="upload-label">이미지 파일 선택<input id="file-input" type="file" accept="image/png,image/jpeg,image/webp" ${ready ? "" : "disabled"}></label>${button("수집 기록 추가", "add-record", "primary", ready && c.source ? "" : "disabled")}</div><p class="file-note">이미지는 AI 분석 요청에만 전송되며 localStorage에 저장되지 않습니다. 선택 파일 미리보기는 새로고침 뒤 유지되지 않습니다.</p>` : ""}</section>
    <aside class="grid"><section class="card"><p class="eyebrow">SESSION STATE</p><div class="card-top"><h2>${statusLabel(c.status)}</h2>${badge(`${c.records}개 기록`, c.records ? "green" : "neutral")}</div><dl class="definition-list"><dt>준비 gate</dt><dd>${gateCount()}/5</dd><dt>출처</dt><dd>${c.source === "synthetic" ? "AI-generated synthetic example" : c.fileName ? "브라우저 임시 파일" : "미선택"}</dd><dt>검수 상태</dt><dd>${reviewLabel(current().review.status)}</dd></dl>${c.records ? `<div class="actions"><a class="button primary" href="#ai-review">AI 보조검수 진입</a></div>` : ""}</section>${notice(ready ? "다섯 조건이 확인되었습니다. 수집 기록은 독립 검수 전 상태입니다.": "수집을 시작하려면 과제 화면에서 다섯 조건을 모두 확인해야 합니다.", ready ? "success" : "warning")}</aside></div>`;
}

function renderAiReview() {
  const c = current().collection;
  const ai = current().ai;
  const allowed = state.role === "collector";
  const statusTitle = ai.status === "loading" ? "AI 분석 중" : ai.status === "complete" ? "사람 검수 필요" : ai.status === "error" ? "분석 실패" : "분석 실행 전";
  const statusBadge = ai.status === "loading" ? badge("요청 중", "amber") : ai.status === "complete" ? badge("승인 권한 없음", "amber") : ai.status === "error" ? badge("제출 차단", "red") : badge("실행 대기", "neutral");
  const signal = ai.status === "complete" ? `<div class="review-signal"><div class="signal-ring">AI</div><div><h3>${escapeHtml(ai.summary)}</h3><p>${escapeHtml(ai.reason)}</p></div></div><dl class="definition-list"><dt>모델</dt><dd>${escapeHtml(ai.model)}</dd><dt>작업 적합성</dt><dd>${escapeHtml(ai.task_match)}</dd><dt>조명</dt><dd>${escapeHtml(ai.lighting)}</dd><dt>구도</dt><dd>${escapeHtml(ai.framing)}</dd><dt>흐림</dt><dd>${escapeHtml(ai.blur)}</dd><dt>개인정보 위험</dt><dd>${escapeHtml(ai.privacy_risk)}</dd><dt>권고</dt><dd>${escapeHtml(ai.recommendation)}</dd><dt>재수집 안내</dt><dd>${escapeHtml(ai.recollection_guidance)}</dd><dt>결정 권한</dt><dd>human · 독립 검수자</dd></dl>`
    : ai.status === "loading" ? `<div class="empty" aria-live="polite" aria-busy="true"><div><strong>same-origin AI 분석을 요청하고 있습니다.</strong><span>결과를 받기 전에는 독립 검수에 제출할 수 없습니다.</span></div></div>`
    : ai.status === "error" ? notice(`<strong>AI 분석 실패:</strong> ${escapeHtml(ai.error)}<br>성공 신호가 저장되지 않았으며 독립 검수 제출이 비활성화되었습니다.`, "danger")
    : `<div class="empty"><div><strong>수집 기록의 실제 이미지를 AI 보조 분석에 보냅니다.</strong><span>결과는 참고 신호이며 승인·게시·보상 결정은 사람이 수행합니다.</span></div></div>`;
  return `${pageHead("AI-ASSISTED REVIEW ENTRY", "AI 신호는 결정을 돕고, 승인하지 않습니다", "same-origin 분석 API가 이미지의 작업 적합성·품질·개인정보 위험을 구조화해 반환합니다.")}
    ${notice("이미지 데이터는 분석 요청 중에만 사용되며 localStorage에는 결과 요약만 저장됩니다. AI는 승인·게시·보상 결정을 하지 않습니다.", "warning")}
    <div class="grid main-side section"><section class="card"><div class="card-top"><div><p class="eyebrow">LIVE API SIGNAL</p><h2>${statusTitle}</h2></div>${statusBadge}</div>
    ${signal}
    ${allowed ? `<div class="actions">${button(ai.status === "loading" ? "AI 분석 중…" : "AI 보조 분석 실행", "run-ai", "secondary", c.records && ai.status !== "loading" ? "" : "disabled")}${button("독립 검수에 제출", "submit-review", "primary", ai.status === "complete" && ai.decisionAuthority === "human" ? "" : "disabled")}</div>` : ""}</section>
    <aside class="card"><p class="eyebrow">HUMAN CONTROL</p><h2>최종 판단 주체</h2><p>검수자는 수집자와 분리되어 승인 또는 보완을 결정하고 이유를 남깁니다.</p><dl class="definition-list"><dt>현재 역할</dt><dd>${roles[state.role].name}</dd><dt>AI 결정</dt><dd>승인 불가</dd><dt>사람 검수</dt><dd>${reviewLabel(current().review.status)}</dd></dl></aside></div>`;
}

function renderReview() {
  const c = current().collection;
  const review = current().review;
  const allowed = state.role === "reviewer";
  const submitted = c.status === "submitted";
  const decisionPending = submitted && review.status === "pending";
  return `${pageHead("INDEPENDENT HUMAN REVIEW", "수집자와 분리된 사람이 최종 판단합니다", "AI 보조 신호와 원본 맥락을 함께 확인하고 승인 또는 보완 사유를 남깁니다.")}
    ${!allowed ? notice("현재 역할에는 승인·보완 동작이 제공되지 않습니다. 수집자는 자신의 기록을 검수할 수 없습니다.", "danger") : ""}
    <div class="grid main-side"><section class="card"><div class="card-top"><div><p class="eyebrow">REVIEW QUEUE</p><h2>${submitted ? field().task : "제출 대기"}</h2></div>${badge(reviewLabel(review.status), review.status === "approved" ? "green" : review.status === "rework" ? "red" : "amber")}</div>
    <dl class="definition-list"><dt>수집자</dt><dd>${c.submittedBy || "제출 전"}</dd><dt>수집 기록</dt><dd>${c.records}개</dd><dt>AI 신호</dt><dd>${current().ai.status === "complete" ? "사람 검수 필요" : current().ai.status === "error" ? "분석 실패 · 제출 차단" : "실행 전"}</dd><dt>출처</dt><dd>${c.source === "synthetic" ? "AI-generated synthetic example" : c.fileName ? "브라우저 임시 파일" : "미선택"}</dd></dl>
    ${decisionPending && allowed ? `<label class="field">검수·보완 사유<textarea id="review-reason" placeholder="결정 근거 또는 보완 요청 이유를 입력하세요.">${escapeHtml(review.reason)}</textarea></label><div class="actions">${button("보완 요청", "request-rework", "danger")}${button("사람 검수 승인", "approve-review", "primary")}</div>` : submitted && review.status !== "pending" ? notice(`<strong>저장된 사람 결정:</strong> ${escapeHtml(review.reason)}`, review.status === "approved" ? "success" : "warning") : submitted ? "" : `<div class="empty"><div><strong>독립 검수에 제출된 기록이 없습니다.</strong><span>수집자가 AI 보조 신호를 확인한 뒤 제출해야 합니다.</span></div></div>`}</section>
    <aside class="grid"><section class="card tint"><p class="eyebrow">DECISION SEPARATION</p><h2>분리된 상태 축</h2><dl class="definition-list"><dt>수집</dt><dd>${statusLabel(c.status)}</dd><dt>검수</dt><dd>${reviewLabel(review.status)}</dd><dt>접근</dt><dd>${accessLabel(current().dataset.access)}</dd><dt>보상</dt><dd>조건 확인만 · 실제 지급 없음</dd></dl></section>${notice("AI 결과만으로 승인할 수 없습니다. 보완 요청에는 사람이 작성한 이유가 필요합니다.")}</aside></div>`;
}

function renderDataset() {
  const d = current().dataset;
  const canPublish = state.role === "coordinator" && current().review.status === "approved" && d.status !== "published";
  const canRequest = state.role === "requester" && d.status === "published";
  return `${pageHead("RIGHTS-AWARE DATASET", "출처·권리·검수 상태를 한 버전에 묶습니다", "승인된 항목만 게시 준비 상태가 되며 접근 결정은 검수와 별도입니다.")}
    <div class="grid main-side"><section class="card"><div class="card-top"><div><p class="eyebrow">${field().taskId} · ${d.version}</p><h2>${field().task} 데이터셋</h2></div>${badge(datasetLabel(d.status), d.status === "published" ? "green" : "amber")}</div>
    <div class="data-table-wrap"><table class="data-table"><thead><tr><th>데이터</th><th>출처 라벨</th><th>사람 검수</th><th>권리 경계</th></tr></thead><tbody><tr><td data-label="데이터">${escapeHtml(field().data)}</td><td data-label="출처 라벨">AI-generated synthetic example</td><td data-label="사람 검수">${reviewLabel(current().review.status)}</td><td data-label="권리 경계">제품 흐름 시연용 · 실제 현장/청년 수행/학습 승인 데이터 아님</td></tr></tbody></table></div>
    <div class="actions">${canPublish ? button("검수 결과로 버전 게시", "publish-dataset", "primary") : ""}${canRequest ? button("데모 접근 신청", "request-access", "primary") : ""}${state.role === "coordinator" && d.access === "requested" ? button("브라우저 접근 기록 승인", "grant-access", "secondary") : ""}</div></section>
    <aside class="card"><p class="eyebrow">PROVENANCE</p><h2>버전 계보</h2><ol class="lineage"><li><b>1</b><div><strong>과제 범위</strong><span>${field().taskId} · ${escapeHtml(field().scope)}</span></div></li><li><b>2</b><div><strong>수집 기록</strong><span>${current().collection.records}개 · ${statusLabel(current().collection.status)}</span></div></li><li><b>3</b><div><strong>사람 검수</strong><span>${reviewLabel(current().review.status)}</span></div></li><li><b>4</b><div><strong>이용 접근</strong><span>${accessLabel(d.access)}</span></div></li></ol></aside></div>
    <section class="section"><div class="section-heading"><div><p class="eyebrow">INTEGRATION LABELS</p><h2>외부 카탈로그 상태</h2></div><p>어떤 외부 데이터도 이 데모에 가져오지 않았습니다.</p></div><div class="grid three">${[["KAMP AI","External catalog link"],["AI Hub","External catalog link"],["공공데이터포털","External catalog link"]].map(([name,label]) => `<article class="card compact"><div class="card-top"><h3>${name}</h3>${badge(label)}</div><p>공식 출처의 이용 조건 확인과 별도 도입 결정이 필요합니다. Live API가 아닙니다.</p></article>`).join("")}</div></section>`;
}

function renderCareer() {
  const c = current();
  const evidence = [
    ["교육 이수", c.gates.training ? "브라우저 확인 기록" : "미확인", c.gates.training],
    ["허용 작업", c.gates.scope ? field().task : "미확인", c.gates.scope],
    ["안전 교육", c.gates.safety ? "브라우저 확인 기록" : "미확인", c.gates.safety],
    ["독립 검수된 품질", c.review.status === "approved" ? "사람 검수 승인 기록" : "미확인", c.review.status === "approved"],
    ["현장 경험", c.collection.records ? `${field().short} 모의 현장 · ${c.collection.records}개 기록` : "미확인", c.collection.records > 0],
    ["추적 가능한 기여", c.dataset.status === "published" ? c.dataset.version : "미확인", c.dataset.status === "published"],
  ];
  return `${pageHead("PROPOSED CAREER PATHS", "현장 AI 신직무를 증거 중심으로 보여 줍니다", "순위나 작업 건수가 아니라 교육·허용 범위·독립 검수·현장 맥락의 연결을 확인합니다.")}
    <section class="grid three">${careerPaths.map(([title, description, number]) => `<article class="card career-card"><span class="career-icon">${number}</span><h2>${title}</h2><p>${description}</p>${badge(title === "현장 적용 전문가" && state.field === "smallBusiness" ? "제조 중심 경로" : "제안 경로")}</article>`).join("")}</section>
    <section class="section grid main-side"><article class="card"><div class="card-top"><div><p class="eyebrow">CAREER EVIDENCE</p><h2>검증 가능한 데모 증거</h2></div>${badge("localStorage 모의 기록", "neutral")}</div><ul class="evidence-list">${evidence.map(([title,value,done]) => `<li><span class="evidence-dot">${done ? "✓" : "·"}</span><span><strong>${title}</strong><br><small>${escapeHtml(value)}</small></span>${badge(done ? "확인됨" : "미확인", done ? "green" : "neutral")}</li>`).join("")}</ul></article>
    <aside>${notice("이 화면은 공인 교육 이수, 자격증, 채용·고용 성과, 임금 또는 실제 지급을 증명하지 않습니다. 브라우저 데모 상태를 경력 증거 구조로 보여 줄 뿐입니다.", "warning")}</aside></section>`;
}

function renderIncident() {
  if (state.field !== "manufacturing") return `${pageHead("FIELD-SPECIFIC MODULE", "제조 현장에서만 제공되는 흐름입니다", "소상공인 MVP에는 현장 적용 전문가와 사고·재수집 모듈을 노출하지 않습니다.")}<div class="empty"><div><strong>제조 현장으로 전환하세요.</strong><span>상단의 지속 현장 전환기를 사용할 수 있습니다.</span></div></div>`;
  const incident = current().incident;
  const allowed = ["fde", "coordinator"].includes(state.role);
  return `${pageHead("INCIDENT → RECOLLECTION", "실패 원인을 새 수집 범위로 연결합니다", "모델·장비를 제어하지 않고 사고 조건, 버전, 재수집 과제의 계보만 브라우저에 기록합니다.")}
    ${!allowed ? notice("현재 역할에는 사고 등록·재수집 생성 동작이 제공되지 않습니다. 현장 적용 전문가 또는 운영 코디네이터로 전환하세요.", "danger") : ""}
    <div class="grid main-side"><section class="card"><div class="card-top"><div><p class="eyebrow">INCIDENT RECORD</p><h2>${incident.status === "none" ? "새 사고 기록" : "환경 변화 감지 기록"}</h2></div>${badge(incident.status === "recollection" ? "재수집 연결됨" : incident.status === "logged" ? "원인 확인 중" : "기록 전", incident.status === "recollection" ? "green" : "amber")}</div>
    <label class="field">관찰된 실패와 조건<textarea id="incident-description" placeholder="예: 측면 조명이 바뀐 뒤 반사면 경계 판정이 불안정함">${escapeHtml(incident.description)}</textarea></label>${allowed ? `<div class="actions">${button("사고 조건 기록", "log-incident", "secondary")}${button("재수집 과제 생성", "create-recollection", "primary", incident.status === "logged" ? "" : "disabled")}</div>` : ""}</section>
    <aside class="card tint"><p class="eyebrow">TRACEABILITY</p><h2>실패-과제 계보</h2><dl class="definition-list"><dt>기준 버전</dt><dd>${current().dataset.version}</dd><dt>사고 조건</dt><dd>${incident.description || field().incident}</dd><dt>재수집 ID</dt><dd>${incident.recollectionId || "생성 전"}</dd><dt>새 범위</dt><dd>${incident.recollectionId ? "변경 조명 조건의 반사면 샘플만" : "미정"}</dd></dl></aside></div>`;
}

const renderers = { home: renderHome, task: renderTask, collect: renderCollect, "ai-review": renderAiReview, review: renderReview, dataset: renderDataset, career: renderCareer, incident: renderIncident };

function render() {
  const requested = location.hash.slice(1);
  const viewId = renderers[requested] ? requested : starts[state.role];
  updateShell(viewId);
  $("#view").innerHTML = renderers[viewId]();
  document.title = `${$("h1")?.textContent || "NAEIL"} · NAEIL`;
  closeMenu();
}

function navigate(viewId) {
  if (location.hash === `#${viewId}`) render();
  else location.hash = viewId;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3300);
}

function closeMenu() {
  $("#sidebar").classList.remove("open");
  $("#sidebar-scrim").hidden = true;
  $("#menu-button").setAttribute("aria-expanded", "false");
}

function openMenu() {
  $("#sidebar").classList.add("open");
  $("#sidebar-scrim").hidden = false;
  $("#menu-button").setAttribute("aria-expanded", "true");
}

function statusLabel(status) { return ({ idle: "시작 전", collecting: "수집 중", submitted: "검수 제출됨", rework: "보완 중" })[status] || "시작 전"; }
function reviewLabel(status) { return ({ waiting: "제출 대기", pending: "검수 대기", approved: "사람 승인", rework: "보완 요청" })[status] || "제출 대기"; }
function datasetLabel(status) { return ({ draft: "초안", ready: "게시 준비", published: "브라우저 게시본" })[status] || "초안"; }
function accessLabel(status) { return ({ notRequested: "미신청", requested: "신청 기록", granted: "브라우저 승인 기록" })[status] || "미신청"; }

function resetDownstream() {
  const f = current();
  f.ai = defaultFieldState().ai;
  f.review = defaultFieldState().review;
  f.dataset = defaultFieldState().dataset;
}

document.addEventListener("change", async event => {
  if (event.target.id === "field-select") {
    state.field = event.target.value;
    previewUrl = "";
    if (!roleAllowed(state.role)) {
      state.role = "coordinator";
      showToast("소상공인 MVP에는 현장 적용 전문가 역할이 없어 운영 코디네이터로 전환했습니다.");
    }
    save();
    navigate(starts[state.role]);
  }
  if (event.target.id === "role-select") {
    state.role = event.target.value;
    save();
    navigate(starts[state.role]);
    showToast(`${roles[state.role].name} 시작 화면으로 이동했습니다.`);
  }
  if (event.target.matches("[data-gate]")) {
    const key = event.target.dataset.gate;
    if (!canToggleGate(key)) {
      event.target.checked = current().gates[key];
      showToast("현재 역할이 확인할 수 없는 조건입니다.");
      return;
    }
    current().gates[key] = event.target.checked;
    save();
    render();
    showToast(`준비 조건 ${gateCount()}/5가 확인되었습니다.`);
  }
  if (event.target.id === "file-input") {
    const file = event.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    try {
      imageDataByField[state.field] = await blobToDataUrl(file);
    } catch (error) {
      imageDataByField[state.field] = "";
      showToast(error instanceof Error ? error.message : "이미지 파일을 읽을 수 없습니다.");
      return;
    }
    current().collection.source = "upload";
    current().collection.fileName = file.name;
    resetDownstream();
    save();
    render();
    showToast("파일은 브라우저 메모리에만 열었습니다. localStorage에는 저장되지 않습니다.");
  }
});

document.addEventListener("click", async event => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  const f = current();
  if (action === "confirm-request") showToast("과제 범위를 브라우저 데모 상태로 확인했습니다.");
  if (action === "use-synthetic") {
    imageDataByField[state.field] = "";
    f.collection.source = "synthetic";
    f.collection.fileName = syntheticAsset().split("/").at(-1);
    resetDownstream();
    save(); render(); showToast("AI-generated synthetic example을 선택했습니다.");
  }
  if (action === "add-record") {
    if (state.role !== "collector" || !allGates()) return showToast("수집 역할과 다섯 조건 확인이 필요합니다.");
    f.collection.records += 1;
    f.collection.status = "collecting";
    resetDownstream();
    save(); render(); showToast("수집 기록을 추가했습니다. 아직 검수 전입니다.");
  }
  if (action === "run-ai") {
    if (state.role !== "collector" || f.collection.records < 1) return showToast("수집 기록이 필요합니다.");
    await runAiAnalysis();
  }
  if (action === "submit-review") {
    if (state.role !== "collector" || f.ai.status !== "complete" || f.ai.decisionAuthority !== "human") return showToast("유효한 AI 보조 분석과 데이터 오퍼레이터 역할이 필요합니다.");
    f.collection.status = "submitted";
    f.collection.submittedBy = "데이터 오퍼레이터 · 브라우저 데모";
    f.review = { status: "pending", reason: "", reviewer: "" };
    save(); render(); showToast("독립 검수 대기열에 제출했습니다.");
  }
  if (action === "request-rework" || action === "approve-review") {
    if (state.role !== "reviewer") return showToast("독립 검수자 역할만 결정할 수 있습니다.");
    if (f.collection.status !== "submitted") return showToast("제출된 수집 기록이 없습니다.");
    const reason = $("#review-reason")?.value.trim() || "";
    if (!reason) return showToast("사람의 결정 근거 또는 보완 사유를 입력하세요.");
    if (action === "request-rework") {
      f.review = { status: "rework", reason, reviewer: "독립 검수자 · 브라우저 데모" };
      f.collection.status = "rework";
      f.gates.compensation = false;
      f.dataset = defaultFieldState().dataset;
      showToast("보완 사유를 저장했습니다. 보상 조건을 다시 확인해야 합니다.");
    } else {
      f.review = { status: "approved", reason, reviewer: "독립 검수자 · 브라우저 데모" };
      f.dataset.status = "ready";
      showToast("사람 검수 결정을 저장했습니다. 접근 승인은 별도입니다.");
    }
    save(); render();
  }
  if (action === "publish-dataset") {
    if (state.role !== "coordinator" || f.review.status !== "approved") return showToast("운영 역할과 사람 검수 승인이 필요합니다.");
    f.dataset.status = "published";
    f.dataset.version = "v1.0-demo";
    save(); render(); showToast("브라우저 데모 버전을 게시했습니다. 실제 저장소에는 배포되지 않습니다.");
  }
  if (action === "request-access") {
    if (state.role !== "requester") return showToast("요청자 역할에서만 접근을 신청할 수 있습니다.");
    f.dataset.access = "requested";
    save(); render(); showToast("브라우저 접근 신청 기록을 남겼습니다.");
  }
  if (action === "grant-access") {
    if (state.role !== "coordinator") return showToast("운영 코디네이터 역할이 필요합니다.");
    f.dataset.access = "granted";
    save(); render(); showToast("브라우저 승인 기록을 남겼습니다. 실제 인증 권한이 아닙니다.");
  }
  if (action === "log-incident") {
    if (!["fde", "coordinator"].includes(state.role)) return showToast("현장 적용 또는 운영 역할이 필요합니다.");
    const description = $("#incident-description")?.value.trim() || "";
    if (!description) return showToast("관찰된 실패 조건을 입력하세요.");
    f.incident = { status: "logged", description, recollectionId: "" };
    save(); render(); showToast("사고 조건을 버전과 연결했습니다.");
  }
  if (action === "create-recollection") {
    if (!["fde", "coordinator"].includes(state.role) || f.incident.status !== "logged") return showToast("기록된 사고 조건이 필요합니다.");
    f.incident.status = "recollection";
    f.incident.recollectionId = "MF-RECOLLECT-01";
    save(); render(); showToast("실패 원인에서 범위가 정해진 재수집 과제를 만들었습니다.");
  }
});

$("#menu-button").addEventListener("click", () => $("#sidebar").classList.contains("open") ? closeMenu() : openMenu());
$("#sidebar-scrim").addEventListener("click", closeMenu);
$("#reset-state").addEventListener("click", () => {
  state = defaultState();
  previewUrl = "";
  imageDataByField.manufacturing = "";
  imageDataByField.smallBusiness = "";
  save();
  navigate("home");
  showToast("이 브라우저의 NAEIL 데모 기록을 초기화했습니다.");
});
document.addEventListener("keydown", event => { if (event.key === "Escape") closeMenu(); });
window.addEventListener("hashchange", () => { render(); $("#main").focus({ preventScroll: true }); window.scrollTo({ top: 0 }); });

if (!roleAllowed(state.role)) state.role = "coordinator";
if (!location.hash) location.hash = starts[state.role];
else render();
