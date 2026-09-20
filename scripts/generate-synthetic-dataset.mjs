import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_SEED = 'naeil-synthetic-observations-v1';
export const DATASET_VERSION = '1.0.0';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const catalogPath = path.join(projectRoot, 'public/data/catalog.json');
const observationsPath = path.join(projectRoot, 'public/data/synthetic-observations.json');
const taxonomyPath = path.join(projectRoot, 'public/data/quality-taxonomy.json');
const reviewEventsPath = path.join(projectRoot, 'public/data/review-events.json');
const recollectionTasksPath = path.join(projectRoot, 'public/data/recollection-tasks.json');
const evaluationCasesPath = path.join(projectRoot, 'public/data/evaluation-cases.json');
const trainingCatalogPath = path.join(projectRoot, 'public/data/training-catalog.json');
const roleTaskMatrixPath = path.join(projectRoot, 'public/data/role-task-matrix.json');
const careerEvidencePath = path.join(projectRoot, 'public/data/career-evidence.json');
const imageGenerationQueuePath = path.join(projectRoot, 'public/data/image-generation-queue.json');
const imageGenerationCompletionsPath = path.join(projectRoot, 'public/data/image-generation-completions.json');
const imageRightsPolicyPath = path.join(projectRoot, 'public/data/image-rights-policy.json');
const datasetIndexPath = path.join(projectRoot, 'public/data/dataset-index.json');
const datasetCoveragePath = path.join(projectRoot, 'public/data/dataset-coverage.json');
const assetManifestPath = path.join(projectRoot, 'public/assets/asset-manifest.json');

const usageBoundary = '프로토타입 검증용 AI 생성 합성 관찰값이며 실제 청년 수집 또는 청년 수행, 파트너 현장 데이터, 승인 학습 데이터 또는 고용 성과가 아님';
const careerUsageBoundary = '비식별 합성 프로필의 demonstration-only 기록이며 실제 사람, 청년 활동, 교육 수료, 자격, 채용, 임금, 고용 성과, 고객, 파트너 또는 결제를 증명하지 않음';
const imageQueueUsageBoundary = '아직 생성되지 않은 합성 이미지 계획이며 실제 현장 수집, 청년 수행, 파트너 사업장 자료, 생성 완료 자산, 권리 승인 자산 또는 승인 학습 데이터가 아님';
const datasetDiscoveryUsageBoundary = '현재 저장소의 결정적 합성·제안·계획 메타데이터 범위만 집계하며 실제 사람, 실제 현장 수집, 승인 학습 데이터, 교육·자격·고용·고객·파트너·수익 성과를 증명하지 않음';
const evaluationUsageBoundary = 'metadata-only 합성 평가 계약이며 이미지 데이터, 실제 모델 실행, 실제 사용자·현장 수집, 승인 학습 데이터, 정확도·점수·성능 측정 또는 고용 성과가 아님';

const scenarioDefinitions = [
  {
    id: 'syn-mfg-001-component-surface',
    field: 'manufacturing',
    title: '소형 가공 부품 표면 상태 예시',
    taskType: 'component-surface-inspection',
    primaryObject: '합성 가공 부품',
    targetArea: '부품 표면과 가장자리',
    syntheticReference: { type: 'asset-reference', id: 'asset-mfg-001-inspection', manifestPath: 'public/assets/asset-manifest.json' },
  },
  {
    id: 'syn-mfg-002-fastener-tray',
    field: 'manufacturing',
    title: '체결부품 트레이 배열 예시',
    taskType: 'fastener-tray-arrangement',
    primaryObject: '합성 체결부품 트레이',
    targetArea: '트레이 칸과 부품 배열',
    syntheticReference: { type: 'prompt-reference', id: 'prompt-mfg-fastener-tray-v1', promptTextStored: false, intentSummary: '식별 정보 없는 체결부품 트레이 배열 합성 장면' },
  },
  {
    id: 'syn-mfg-003-safety-zone',
    field: 'manufacturing',
    title: '안전구역 바닥 표시 예시',
    taskType: 'safety-zone-marking-check',
    primaryObject: '합성 안전구역 표시',
    targetArea: '통로 경계와 바닥 표시',
    syntheticReference: { type: 'prompt-reference', id: 'prompt-mfg-safety-zone-v1', promptTextStored: false, intentSummary: '실제 위치 정보 없는 제조 안전구역 표시 합성 장면' },
  },
  {
    id: 'syn-mfg-004-packaging-check',
    field: 'manufacturing',
    title: '부품 포장 상태 확인 예시',
    taskType: 'component-packaging-check',
    primaryObject: '합성 부품 포장',
    targetArea: '밀봉부와 완충재 배치',
    syntheticReference: { type: 'prompt-reference', id: 'prompt-mfg-packaging-check-v1', promptTextStored: false, intentSummary: '브랜드와 운송장 정보가 없는 부품 포장 합성 장면' },
  },
  {
    id: 'syn-mfg-005-bin-label',
    field: 'manufacturing',
    title: '부품 보관함 라벨 정합 예시',
    taskType: 'parts-bin-label-verification',
    primaryObject: '합성 부품 보관함',
    targetArea: '보관함 위치와 비식별 범주 라벨',
    syntheticReference: { type: 'prompt-reference', id: 'prompt-mfg-bin-label-v1', promptTextStored: false, intentSummary: '실제 업체명이나 재고번호가 없는 부품 보관함 라벨 합성 장면' },
  },
  {
    id: 'syn-mfg-006-cobot-clearance',
    field: 'manufacturing',
    title: '코봇 인계구역 여유 공간 예시',
    taskType: 'cobot-handoff-clearance-check',
    primaryObject: '합성 코봇 인계구역',
    targetArea: '코봇 주변 여유 공간과 인계 지점',
    syntheticReference: { type: 'prompt-reference', id: 'prompt-mfg-cobot-clearance-v1', promptTextStored: false, intentSummary: '사람 식별 정보와 로고가 없는 코봇 인계구역 합성 장면' },
  },
  {
    id: 'syn-smb-001-bakery-shelf',
    field: 'small-business',
    title: '제과점 진열대 정리 예시',
    taskType: 'bakery-shelf-arrangement',
    primaryObject: '합성 제과 진열대',
    targetArea: '빵 진열 간격과 트레이 위치',
    syntheticReference: { type: 'asset-reference', id: 'asset-smb-001-bakery-rack', manifestPath: 'public/assets/asset-manifest.json' },
  },
  {
    id: 'syn-smb-002-cafe-tray',
    field: 'small-business',
    title: '카페 빈 컵과 트레이 정리 예시',
    taskType: 'cafe-cup-tray-sorting',
    primaryObject: '합성 컵과 트레이',
    targetArea: '컵 분류와 트레이 적재',
    syntheticReference: { type: 'asset-reference', id: 'asset-smb-002-cup-sorting', manifestPath: 'public/assets/asset-manifest.json' },
  },
  {
    id: 'syn-smb-003-produce-weighing',
    field: 'small-business',
    title: '청과물 계량 작업 예시',
    taskType: 'produce-weighing-check',
    primaryObject: '합성 청과물과 저울',
    targetArea: '계량 접시와 표시 상태',
    syntheticReference: { type: 'prompt-reference', id: 'prompt-smb-produce-weighing-v1', promptTextStored: false, intentSummary: '상호와 가격표 정보가 없는 청과물 계량 합성 장면' },
  },
  {
    id: 'syn-smb-004-florist-wrapping',
    field: 'small-business',
    title: '꽃집 포장 단계 예시',
    taskType: 'florist-wrapping-stage-check',
    primaryObject: '합성 꽃다발 포장',
    targetArea: '포장지 접힘과 묶음 단계',
    syntheticReference: { type: 'prompt-reference', id: 'prompt-smb-florist-wrapping-v1', promptTextStored: false, intentSummary: '고객 정보와 상호가 없는 꽃다발 포장 합성 장면' },
  },
  {
    id: 'syn-smb-005-shelf-label',
    field: 'small-business',
    title: '소매 진열 라벨 정렬 예시',
    taskType: 'retail-shelf-label-alignment',
    primaryObject: '합성 소매 진열대',
    targetArea: '상품 자리와 비식별 범주 라벨',
    syntheticReference: { type: 'prompt-reference', id: 'prompt-smb-shelf-label-v1', promptTextStored: false, intentSummary: '브랜드와 실제 가격이 없는 소매 진열 라벨 합성 장면' },
  },
  {
    id: 'syn-smb-006-ingredient-bin',
    field: 'small-business',
    title: '주방 재료통 분류 예시',
    taskType: 'ingredient-bin-sorting',
    primaryObject: '합성 주방 재료통',
    targetArea: '재료통 배열과 비식별 범주 표시',
    syntheticReference: { type: 'prompt-reference', id: 'prompt-smb-ingredient-bin-v1', promptTextStored: false, intentSummary: '매장명과 공급자 정보가 없는 주방 재료통 합성 장면' },
  },
];

const qualityProfiles = [
  {
    id: 'normal-front',
    issueCodes: ['normal'],
    expectedQualityLabel: 'usable',
    confidenceBand: 'high',
    humanReviewDisposition: 'independent-human-review-required',
    recollectionReason: null,
    attributes: { focus: 'sharp', visibility: 'complete', uniqueness: 'unique', scope: 'within-scope', safety: 'no-visible-risk', simulatedCaptureRightsState: 'confirmed', labelAlignment: 'aligned' },
  },
  {
    id: 'blur-motion',
    issueCodes: ['blur'],
    expectedQualityLabel: 'recollection-required',
    confidenceBand: 'high',
    humanReviewDisposition: 'recollection-required-by-independent-reviewer',
    recollectionReason: '움직임 흐림으로 {targetArea}의 판정 근거가 불충분하므로 고정 촬영이 필요함',
    attributes: { focus: 'motion-blur', visibility: 'mostly-visible', uniqueness: 'unique', scope: 'within-scope', safety: 'no-visible-risk', simulatedCaptureRightsState: 'confirmed', labelAlignment: 'aligned' },
  },
  {
    id: 'occlusion-partial',
    issueCodes: ['occlusion'],
    expectedQualityLabel: 'recollection-required',
    confidenceBand: 'high',
    humanReviewDisposition: 'recollection-required-by-independent-reviewer',
    recollectionReason: '가림으로 {targetArea}가 완전히 보이지 않으므로 장애물을 치운 뒤 재촬영이 필요함',
    attributes: { focus: 'sharp', visibility: 'partially-occluded', uniqueness: 'unique', scope: 'within-scope', safety: 'no-visible-risk', simulatedCaptureRightsState: 'confirmed', labelAlignment: 'aligned' },
  },
  {
    id: 'duplicate-near-identical',
    issueCodes: ['duplicate'],
    expectedQualityLabel: 'review-required',
    confidenceBand: 'medium',
    humanReviewDisposition: 'independent-human-review-required',
    recollectionReason: null,
    attributes: { focus: 'sharp', visibility: 'complete', uniqueness: 'near-duplicate', scope: 'within-scope', safety: 'no-visible-risk', simulatedCaptureRightsState: 'confirmed', labelAlignment: 'aligned' },
  },
  {
    id: 'scope-background',
    issueCodes: ['out-of-scope'],
    expectedQualityLabel: 'recollection-required',
    confidenceBand: 'high',
    humanReviewDisposition: 'recollection-required-by-independent-reviewer',
    recollectionReason: '허용 범위 밖 배경이 포함되어 {targetArea}만 보이도록 구도를 다시 제한해야 함',
    attributes: { focus: 'sharp', visibility: 'complete', uniqueness: 'unique', scope: 'background-out-of-scope', safety: 'no-visible-risk', simulatedCaptureRightsState: 'confirmed', labelAlignment: 'aligned' },
  },
  {
    id: 'safety-risk-exposure',
    issueCodes: ['safety-risk'],
    expectedQualityLabel: 'recollection-required',
    confidenceBand: 'high',
    humanReviewDisposition: 'recollection-required-by-independent-reviewer',
    recollectionReason: '합성 장면에 안전 위험 조건이 표현되어 안전 조치 확인 전에는 동일 조건의 수집을 진행할 수 없음',
    attributes: { focus: 'sharp', visibility: 'complete', uniqueness: 'unique', scope: 'within-scope', safety: 'simulated-risk-visible', simulatedCaptureRightsState: 'confirmed', labelAlignment: 'aligned' },
  },
  {
    id: 'rights-unconfirmed',
    issueCodes: ['consent-rights-unconfirmed'],
    expectedQualityLabel: 'rights-blocked',
    confidenceBand: 'high',
    humanReviewDisposition: 'blocked-pending-rights-review',
    recollectionReason: '등가 실제 수집에서 동의와 권리 확인 기록이 없다면 수집을 중단하고 확인 후 새 세션으로 시작해야 함',
    attributes: { focus: 'sharp', visibility: 'complete', uniqueness: 'unique', scope: 'within-scope', safety: 'no-visible-risk', simulatedCaptureRightsState: 'unconfirmed-in-simulated-capture', labelAlignment: 'aligned' },
  },
  {
    id: 'label-mismatch',
    issueCodes: ['label-mismatch'],
    expectedQualityLabel: 'review-required',
    confidenceBand: 'low',
    humanReviewDisposition: 'independent-human-review-required',
    recollectionReason: null,
    attributes: { focus: 'sharp', visibility: 'complete', uniqueness: 'unique', scope: 'within-scope', safety: 'no-visible-risk', simulatedCaptureRightsState: 'confirmed', labelAlignment: 'mismatched' },
  },
  {
    id: 'blur-occlusion-low-light',
    issueCodes: ['blur', 'occlusion'],
    expectedQualityLabel: 'recollection-required',
    confidenceBand: 'medium',
    humanReviewDisposition: 'recollection-required-by-independent-reviewer',
    recollectionReason: '낮은 조도에서 흐림과 가림이 함께 나타나 {targetArea}를 밝고 열린 구도로 다시 촬영해야 함',
    attributes: { focus: 'low-light-blur', visibility: 'partially-occluded', uniqueness: 'unique', scope: 'within-scope', safety: 'no-visible-risk', simulatedCaptureRightsState: 'confirmed', labelAlignment: 'aligned' },
  },
  {
    id: 'normal-oblique',
    issueCodes: ['normal'],
    expectedQualityLabel: 'usable',
    confidenceBand: 'medium',
    humanReviewDisposition: 'independent-human-review-required',
    recollectionReason: null,
    attributes: { focus: 'sharp', visibility: 'complete-oblique-view', uniqueness: 'unique', scope: 'within-scope', safety: 'no-visible-risk', simulatedCaptureRightsState: 'confirmed', labelAlignment: 'aligned' },
  },
];

const qualityTaxonomy = {
  schemaVersion: '1.0.0',
  taxonomyId: 'naeil-synthetic-quality-taxonomy-v1',
  version: DATASET_VERSION,
  status: 'synthetic-evaluation-contract',
  sourceType: 'AI-generated synthetic example',
  collectorSelfApprovalAllowed: false,
  decisionBoundary: '모든 라벨은 합성 예상값이며 AI나 수집자가 승인하지 않고 독립적인 사람이 최종 판단함',
  qualityLabels: [
    { id: 'usable', meaning: '명시된 관찰 기준상 사용 가능 후보이나 독립 사람 검수가 필요함' },
    { id: 'review-required', meaning: '중복 또는 라벨 정합 등 사람의 맥락 판단이 필요함' },
    { id: 'recollection-required', meaning: '동일 목적의 안전한 재수집이 필요함' },
    { id: 'rights-blocked', meaning: '동의 또는 권리 확인 전에는 이용하거나 재수집을 진행할 수 없음' },
  ],
  confidenceBands: [
    { id: 'high', meaning: '합성 관찰 속성이 단일 기준과 직접 대응함' },
    { id: 'medium', meaning: '복합 조건 또는 시점 차이로 사람 확인이 필요함' },
    { id: 'low', meaning: '라벨과 관찰의 불일치로 사람의 맥락 판정이 우선함' },
  ],
  issueCodes: [
    {
      code: 'blur',
      name: '흐림',
      criteria: { trigger: '대상 경계 또는 상태 근거가 움직임·초점 문제로 판독 불가', clear: '핵심 경계와 상태가 선명함' },
      expectedQualityLabel: 'recollection-required',
      humanReviewDisposition: 'recollection-required-by-independent-reviewer',
      recollectionGuidance: '카메라를 고정하고 초점을 대상에 맞춘 뒤 다시 촬영',
    },
    {
      code: 'occlusion',
      name: '가림',
      criteria: { trigger: '핵심 대상 또는 판정 영역 일부가 손·도구·용기 등으로 가려짐', clear: '판정 영역 전체가 보임' },
      expectedQualityLabel: 'recollection-required',
      humanReviewDisposition: 'recollection-required-by-independent-reviewer',
      recollectionGuidance: '안전하게 가림 요소를 제거하고 동일 범위를 다시 촬영',
    },
    {
      code: 'duplicate',
      name: '중복',
      criteria: { trigger: '동일 시나리오의 기존 관찰과 구도·대상 상태가 실질적으로 같음', clear: '새 상태나 필요한 시점 차이가 확인됨' },
      expectedQualityLabel: 'review-required',
      humanReviewDisposition: 'independent-human-review-required',
      recollectionGuidance: '사람 검수자가 중복 여부를 확인하고 필요한 경우 다른 상태를 수집',
    },
    {
      code: 'out-of-scope',
      name: '범위 이탈',
      criteria: { trigger: '승인된 작업 대상 밖의 배경·행동·정보가 포함됨', clear: '승인된 대상과 구역만 포함됨' },
      expectedQualityLabel: 'recollection-required',
      humanReviewDisposition: 'recollection-required-by-independent-reviewer',
      recollectionGuidance: '허용 작업 범위만 포함하도록 구도와 작업 경계를 다시 설정',
    },
    {
      code: 'safety-risk',
      name: '안전 위험',
      criteria: { trigger: '접근 금지, 보호조치 누락 또는 위험 동작이 합성 관찰에 표현됨', clear: '안전 조건이 충족된 범위만 표현됨' },
      expectedQualityLabel: 'recollection-required',
      humanReviewDisposition: 'recollection-required-by-independent-reviewer',
      recollectionGuidance: '수집보다 안전 조치를 우선하고 안전 담당 확인 후 새 세션으로 시작',
    },
    {
      code: 'consent-rights-unconfirmed',
      name: '동의·권리 미확인',
      criteria: { trigger: '등가 실제 수집에서 현장 동의 또는 이용 권리 기록을 확인할 수 없음', clear: '동의와 권리 범위가 기록으로 확인됨' },
      expectedQualityLabel: 'rights-blocked',
      humanReviewDisposition: 'blocked-pending-rights-review',
      recollectionGuidance: '동의와 권리 범위를 확인하기 전 이용과 수집을 중단하고 확인 후 새 세션 생성',
    },
    {
      code: 'label-mismatch',
      name: '라벨 불일치',
      criteria: { trigger: '관찰된 대상·상태가 지정 taskType 또는 기대 라벨과 맞지 않음', clear: '대상·상태·taskType이 일치함' },
      expectedQualityLabel: 'review-required',
      humanReviewDisposition: 'independent-human-review-required',
      recollectionGuidance: '사람 검수자가 라벨 수정과 재수집 중 적절한 조치를 결정',
    },
    {
      code: 'normal',
      name: '정상',
      criteria: { trigger: '위 문제 코드가 없고 대상·범위·안전·권리·라벨 기준이 합성 속성상 일치함', clear: '문제 코드가 하나라도 관찰되면 normal을 함께 사용하지 않음' },
      expectedQualityLabel: 'usable',
      humanReviewDisposition: 'independent-human-review-required',
      recollectionGuidance: null,
    },
  ],
  rights: {
    status: 'clean-room-synthetic-metadata-project-use-only',
    thirdPartyMediaUsed: false,
    codeLicenseApplies: false,
  },
  usageBoundary,
};

const competencyCatalog = [
  { code: 'competency-consent', name: '현장 동의 경계', description: '실제 수집 전 동의 상태와 철회 조건을 구분함' },
  { code: 'competency-scope', name: '허용 작업 범위', description: '승인된 대상·행동·구역 밖으로 작업을 확장하지 않음' },
  { code: 'competency-compensation', name: '보상 인지 분리', description: '보상 인지 기록과 품질·검수 결정을 분리함' },
  { code: 'competency-safety', name: '안전 우선 판단', description: '수집보다 위험 제거와 안전 gate 확인을 우선함' },
  { code: 'competency-quality', name: '품질 관찰', description: '흐림·가림·중복·범위 이탈·라벨 불일치를 구분함' },
  { code: 'competency-rights', name: '권리·이용 경계', description: '출처·이용조건·재사용·철회 경계를 기록함' },
  { code: 'competency-independent-review', name: '독립 사람 검수', description: 'AI 보조 신호와 사람 최종판단을 분리하고 self-review를 금지함' },
  { code: 'competency-recollection', name: '재수집 설계', description: 'issue를 범위가 정해진 안전한 재시도 계획으로 변환함' },
];

const roleCurricula = {
  'occ-001-field-data-coordinator': {
    englishName: 'field data coordinator',
    evidenceType: 'coordination-boundary-demonstration',
    allowedContribution: '동의·범위·gate 상태를 합성 시나리오에서 조율하고 기록함',
    modules: [
      { id: 'training-001-consent-coordination', title: '현장 동의와 철회 조건 조율', competencyCodes: ['competency-consent', 'competency-rights'], topics: ['consent', 'rights'], learningObjective: '동의 확인과 이용 권리 확인을 별도 기록으로 구분함' },
      { id: 'training-002-scope-boundaries', title: '작업 범위와 제한구역 정의', competencyCodes: ['competency-scope', 'competency-safety'], topics: ['task-scope', 'safety'], learningObjective: '허용 대상·행동·구역과 중단 조건을 정의함' },
      { id: 'training-003-compensation-awareness', title: '보상 인지와 상태축 분리', competencyCodes: ['competency-compensation', 'competency-independent-review'], topics: ['compensation-awareness', 'review'], learningObjective: '보상 인지를 품질 승인이나 지급 결과로 오인하지 않음' },
    ],
  },
  'occ-002-physical-ai-data-operator': {
    englishName: 'Physical AI data operator',
    evidenceType: 'synthetic-capture-demonstration',
    allowedContribution: '5개 gate 이후 합성 입력의 범위·안전·품질 관찰을 기록함',
    modules: [
      { id: 'training-004-five-gate-readiness', title: '5개 수집 gate 준비', competencyCodes: ['competency-consent', 'competency-scope', 'competency-compensation'], topics: ['consent', 'task-scope', 'compensation-awareness'], learningObjective: '모든 gate가 실제 수집 전에 필요함을 설명함' },
      { id: 'training-005-capture-quality', title: '합성 관찰 품질 판별', competencyCodes: ['competency-quality'], topics: ['quality'], learningObjective: '품질 taxonomy를 이용해 observable issue를 구분함' },
      { id: 'training-006-safety-stop', title: '안전 중단과 범위 준수', competencyCodes: ['competency-safety', 'competency-scope'], topics: ['safety', 'task-scope'], learningObjective: '위험 또는 범위 이탈 시 수집을 중단함' },
    ],
  },
  'occ-003-quality-safety-reviewer': {
    englishName: 'data quality and safety reviewer',
    evidenceType: 'independent-review-demonstration',
    allowedContribution: '수집자와 분리된 역할에서 품질·안전·재수집 필요성을 판단함',
    modules: [
      { id: 'training-007-review-separation', title: '수집과 독립 검수 분리', competencyCodes: ['competency-independent-review'], topics: ['review'], learningObjective: 'collector self-review를 금지하고 AI 신호를 참고로만 사용함' },
      { id: 'training-008-quality-taxonomy', title: '품질·안전 taxonomy 적용', competencyCodes: ['competency-quality', 'competency-safety'], topics: ['quality', 'safety'], learningObjective: 'issue code와 관찰 근거를 연결함' },
      { id: 'training-009-recollection-reason', title: '이유가 있는 재수집 판단', competencyCodes: ['competency-recollection', 'competency-independent-review'], topics: ['review', 'recollection'], learningObjective: '재수집 disposition과 구체적 이유를 기록함' },
    ],
  },
  'occ-004-data-rights-steward': {
    englishName: 'data rights steward',
    evidenceType: 'rights-boundary-demonstration',
    allowedContribution: '합성 출처·동의·이용조건·철회 경계를 검토함',
    modules: [
      { id: 'training-010-consent-usage', title: '동의와 이용 목적 경계', competencyCodes: ['competency-consent', 'competency-rights'], topics: ['consent', 'rights'], learningObjective: '동의가 이용 목적 전체를 자동 승인하지 않음을 설명함' },
      { id: 'training-011-license-boundary', title: '자산 권리와 코드 라이선스 분리', competencyCodes: ['competency-rights'], topics: ['rights'], learningObjective: '래스터 자산·메타데이터·코드의 권리 범위를 구분함' },
      { id: 'training-012-access-retention', title: '접근·보존·철회 상태 기록', competencyCodes: ['competency-rights', 'competency-independent-review'], topics: ['rights', 'review'], learningObjective: '접근 결정과 검수 결정을 분리해 기록함' },
    ],
  },
  'occ-005-field-deployment-specialist': {
    englishName: 'field deployment specialist',
    evidenceType: 'controlled-context-demonstration',
    allowedContribution: '통제된 합성 맥락에서 안전·품질·범위와 사고 연결을 검토함',
    modules: [
      { id: 'training-013-controlled-handoff', title: '통제된 현장 인계 경계', competencyCodes: ['competency-scope', 'competency-safety'], topics: ['task-scope', 'safety'], learningObjective: '로봇 제어 없이 데이터·장비 버전의 인계 조건만 설명함' },
      { id: 'training-014-incident-quality-link', title: '사고와 품질 issue 연결', competencyCodes: ['competency-quality', 'competency-recollection'], topics: ['quality', 'recollection'], learningObjective: '실패 조건을 데이터 issue와 재수집 필요성에 연결함' },
      { id: 'training-015-version-rights-check', title: '버전과 이용 권리 확인', competencyCodes: ['competency-rights', 'competency-safety'], topics: ['rights', 'safety'], learningObjective: '버전·권리·안전 상태를 적용 승인과 구분함' },
    ],
  },
  'occ-006-recollection-operator': {
    englishName: 'recollection operator',
    evidenceType: 'recollection-planning-demonstration',
    allowedContribution: '독립 검수 결과를 범위가 정해진 합성 재수집 계획으로 변환함',
    modules: [
      { id: 'training-016-issue-scoping', title: 'issue 기반 재수집 범위화', competencyCodes: ['competency-recollection', 'competency-scope'], topics: ['recollection', 'task-scope'], learningObjective: 'source observation issue만 포함하는 재수집 범위를 작성함' },
      { id: 'training-017-gate-reconfirmation', title: '재수집 전 gate 재확인', competencyCodes: ['competency-consent', 'competency-safety', 'competency-compensation'], topics: ['consent', 'safety', 'compensation-awareness'], learningObjective: '재시도도 5개 gate를 다시 확인해야 함을 설명함' },
      { id: 'training-018-retry-lineage', title: '재시도 버전과 검수 계보', competencyCodes: ['competency-recollection', 'competency-independent-review', 'competency-rights'], topics: ['recollection', 'review', 'rights'], learningObjective: 'source observation·review event·retry version의 계보를 보존함' },
    ],
  },
};

function seededIndex(seed, key, length) {
  const digest = createHash('sha256').update(`${seed}\0${key}`).digest();
  return digest.readUInt32BE(0) % length;
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function catalogScenario(scenario) {
  const linked = scenario.syntheticReference.type === 'asset-reference';
  return {
    id: scenario.id,
    scenarioId: scenario.id,
    field: scenario.field,
    title: scenario.title,
    taskType: scenario.taskType,
    sourceType: 'AI-generated synthetic example',
    status: linked ? 'synthetic-raster-linked-not-collected' : 'scenario-metadata-only-no-raster',
    intendedModality: 'image',
    assetRefs: linked ? [scenario.syntheticReference.id] : [],
    syntheticReference: scenario.syntheticReference,
    observationCount: 10,
    observationDatasetRef: 'public/data/synthetic-observations.json',
    qualityTaxonomyRef: 'public/data/quality-taxonomy.json',
    collectionState: 'not-collected',
    trainingApproval: 'not-approved',
    provenance: {
      authorship: 'clean-room-authored-synthetic-scenario',
      thirdPartyMediaUsed: false,
    },
    rights: {
      status: linked ? 'project-use-only' : 'metadata-only',
      basis: linked
        ? '클린룸 imagegen 자산이며 세부 권리는 public/assets/asset-manifest.json에서 확인'
        : '새로 작성한 합성 시나리오 메타데이터이며 래스터 자산이 없음',
      codeLicenseApplies: false,
    },
    usageBoundary,
    version: DATASET_VERSION,
  };
}

function gateApplicability() {
  return Object.fromEntries([
    'site-consent',
    'training',
    'safety',
    'task-scope',
    'compensation-acknowledgement',
  ].map((gate) => [gate, {
    appliesToEquivalentRealCollection: true,
    syntheticRecordState: 'not-evaluated-synthetic',
  }]));
}

function observationRecord(scenario, scenarioIndex, profile, profileIndex, seed) {
  const captureViews = ['front', 'left-oblique', 'right-oblique', 'top-down'];
  const neutralLighting = ['even-neutral', 'soft-neutral', 'controlled-neutral'];
  const recollectionReason = profile.recollectionReason?.replace('{targetArea}', scenario.targetArea) ?? null;
  return {
    id: `obs-${scenario.field === 'manufacturing' ? 'mfg' : 'smb'}-${String(scenarioIndex + 1).padStart(3, '0')}-${String(profileIndex + 1).padStart(3, '0')}`,
    field: scenario.field,
    scenarioId: scenario.id,
    taskType: scenario.taskType,
    syntheticReference: scenario.syntheticReference,
    observableAttributes: {
      variantProfileId: profile.id,
      primaryObject: scenario.primaryObject,
      targetArea: scenario.targetArea,
      captureView: seededIndex(seed, `${scenario.id}:${profile.id}:view`, captureViews.length) === 0 && profile.id === 'normal-oblique'
        ? 'oblique-context-view'
        : captureViews[seededIndex(seed, `${scenario.id}:${profile.id}:view`, captureViews.length)],
      lighting: profile.id === 'blur-occlusion-low-light'
        ? 'low-light'
        : neutralLighting[seededIndex(seed, `${scenario.id}:${profile.id}:lighting`, neutralLighting.length)],
      ...profile.attributes,
      containsPersonalData: false,
      containsPrivateSiteDetails: false,
    },
    expectedQualityLabel: profile.expectedQualityLabel,
    issueCodes: profile.issueCodes,
    confidenceBand: profile.confidenceBand,
    humanReviewDisposition: profile.humanReviewDisposition,
    recollectionReason,
    fiveGateApplicability: gateApplicability(),
    sourceType: 'AI-generated synthetic example',
    status: 'synthetic-not-collected-not-training-approved',
    rights: {
      status: scenario.syntheticReference.type === 'asset-reference'
        ? 'project-use-as-recorded-in-asset-manifest'
        : 'clean-room-synthetic-metadata-project-use-only',
      basis: scenario.syntheticReference.type === 'asset-reference'
        ? 'public/assets/asset-manifest.json의 개별 프로젝트 사용 허가'
        : '이 저장소를 위해 새로 작성한 합성 시나리오와 결정적 관찰 메타데이터',
      thirdPartyMediaUsed: false,
      codeLicenseApplies: false,
    },
    usageBoundary,
    createdBySyntheticGenerator: {
      script: 'scripts/generate-synthetic-dataset.mjs',
      seed,
      generatorVersion: DATASET_VERSION,
      deterministic: true,
      humanFinalDecisionRequired: true,
    },
    version: DATASET_VERSION,
  };
}

function lifecycleRights(observation) {
  return {
    status: 'inherits-synthetic-observation-rights',
    sourceObservationRightsStatus: observation.rights.status,
    thirdPartyMediaUsed: false,
    codeLicenseApplies: false,
  };
}

function lifecycleReasonCode(prefix, observation) {
  return `${prefix}-${observation.issueCodes.join('-and-')}`;
}

function aiDisposition(observation) {
  return {
    usable: 'signal-usable-candidate',
    'review-required': 'signal-human-review-needed',
    'recollection-required': 'signal-recollection-suggested',
    'rights-blocked': 'signal-rights-hold-suggested',
  }[observation.expectedQualityLabel];
}

function humanDisposition(observation) {
  if (observation.expectedQualityLabel === 'usable') return 'accepted-for-synthetic-demo';
  if (observation.expectedQualityLabel === 'recollection-required') return 'recollection-required';
  if (observation.expectedQualityLabel === 'rights-blocked') return 'rights-verification-required';
  if (observation.issueCodes.includes('duplicate')) return 'duplicate-resolution-required';
  return 'label-correction-required';
}

function needsRecollectionTask(observation) {
  return observation.issueCodes.some((code) => code !== 'normal');
}

function recollectionTaskId(observation) {
  return `recollect-${observation.id.slice('obs-'.length)}`;
}

function reviewEventPair(observation, observationIndex) {
  const base = {
    observationId: observation.id,
    scenarioId: observation.scenarioId,
    field: observation.field,
    issueCodes: observation.issueCodes,
    datasetVersionFrom: `naeil-synthetic-observations-v1@${DATASET_VERSION}`,
    datasetVersionTo: `naeil-synthetic-observations-v1@${DATASET_VERSION}`,
    sourceType: 'AI-generated synthetic example',
    status: 'recorded-deterministic-synthetic-event',
    rights: lifecycleRights(observation),
    usageBoundary,
  };
  const hasTask = needsRecollectionTask(observation);
  return [
    {
      eventId: `event-ai-${observation.id.slice('obs-'.length)}`,
      ...base,
      eventType: 'assistive_ai_signal',
      actorRole: 'ai-quality-assistant',
      decisionAuthority: 'assistive-only-no-approval-authority',
      disposition: aiDisposition(observation),
      reasonCode: lifecycleReasonCode('ai-signal', observation),
      sequence: `review-seq-${String((observationIndex * 2) + 1).padStart(6, '0')}`,
      recollectionTaskId: null,
    },
    {
      eventId: `event-human-${observation.id.slice('obs-'.length)}`,
      ...base,
      eventType: 'independent_human_review',
      actorRole: 'independent-quality-reviewer',
      decisionAuthority: 'human',
      disposition: humanDisposition(observation),
      reasonCode: lifecycleReasonCode('human-review', observation),
      sequence: `review-seq-${String((observationIndex * 2) + 2).padStart(6, '0')}`,
      recollectionTaskId: hasTask ? recollectionTaskId(observation) : null,
    },
  ];
}

function recollectionTask(observation, taxonomyByCode) {
  const guidance = observation.issueCodes
    .filter((code) => code !== 'normal')
    .map((code) => taxonomyByCode.get(code)?.recollectionGuidance)
    .filter(Boolean);
  const reason = observation.recollectionReason ?? guidance.join(' / ');
  return {
    taskId: recollectionTaskId(observation),
    sourceObservationId: observation.id,
    scenarioId: observation.scenarioId,
    field: observation.field,
    scopedIssueCodes: observation.issueCodes.filter((code) => code !== 'normal'),
    reason,
    requiredFiveGates: [
      'site-consent',
      'training',
      'safety',
      'task-scope',
      'compensation-acknowledgement',
    ].map((gate) => ({ gate, state: 'must-be-reconfirmed-before-equivalent-real-recollection' })),
    allowedTaskScope: {
      taskType: observation.taskType,
      targetArea: observation.observableAttributes.targetArea,
      boundary: '원 observation의 합성 taskType과 targetArea 안에서만 재시도하며 실제 현장 작업을 지시하지 않음',
    },
    safetyReminder: observation.issueCodes.includes('safety-risk')
      ? '실제 재수집을 가정할 때 수집보다 위험 제거와 안전 담당자 확인을 우선해야 함'
      : '실제 재수집을 가정할 때 안전 gate와 허용 범위를 다시 확인해야 함',
    humanAssigneeRole: 'recollection-operator',
    retryVersion: `${DATASET_VERSION}-synthetic-retry`,
    completionStatus: 'not-started-synthetic-plan',
    sourceType: 'AI-generated synthetic example',
    status: 'deterministic-recollection-plan-not-field-assignment',
    rights: lifecycleRights(observation),
    usageBoundary,
  };
}

export function buildSyntheticLifecycle({ seed = DEFAULT_SEED, observations, taxonomy }) {
  if (!observations || !Array.isArray(observations.records)) {
    throw new Error('canonical synthetic observations are required');
  }
  if (!taxonomy || !Array.isArray(taxonomy.issueCodes)) {
    throw new Error('canonical quality taxonomy is required');
  }
  const taxonomyByCode = new Map(taxonomy.issueCodes.map((issue) => [issue.code, issue]));
  const events = observations.records.flatMap(reviewEventPair);
  const recollectionRecords = observations.records
    .filter(needsRecollectionTask)
    .map((observation) => recollectionTask(observation, taxonomyByCode));
  const reviewEvents = {
    schemaVersion: '1.0.0',
    datasetId: 'naeil-synthetic-review-events-v1',
    version: DATASET_VERSION,
    seed,
    sourceObservationDatasetRef: 'public/data/synthetic-observations.json',
    qualityTaxonomyRef: 'public/data/quality-taxonomy.json',
    recollectionTasksRef: 'public/data/recollection-tasks.json',
    sourceType: 'AI-generated synthetic example',
    status: 'deterministic-synthetic-lifecycle-events',
    logicalSequenceBasis: 'zero-time deterministic order; two ordered events per observation',
    eventCount: events.length,
    eventTypeCounts: {
      assistive_ai_signal: events.filter((event) => event.eventType === 'assistive_ai_signal').length,
      independent_human_review: events.filter((event) => event.eventType === 'independent_human_review').length,
    },
    actorSeparation: {
      collectorMaySelfReview: false,
      aiMayApprove: false,
      independentHumanReviewerRequired: true,
    },
    rights: {
      status: 'inherits-synthetic-observation-rights',
      thirdPartyMediaUsed: false,
      codeLicenseApplies: false,
    },
    usageBoundary,
    createdBySyntheticGenerator: {
      script: 'scripts/generate-synthetic-dataset.mjs',
      seed,
      generatorVersion: DATASET_VERSION,
      deterministic: true,
    },
    events,
  };
  const recollectionTasks = {
    schemaVersion: '1.0.0',
    datasetId: 'naeil-synthetic-recollection-tasks-v1',
    version: DATASET_VERSION,
    seed,
    sourceObservationDatasetRef: 'public/data/synthetic-observations.json',
    qualityTaxonomyRef: 'public/data/quality-taxonomy.json',
    reviewEventsRef: 'public/data/review-events.json',
    sourceType: 'AI-generated synthetic example',
    status: 'deterministic-synthetic-recollection-plans',
    taskCount: recollectionRecords.length,
    assignmentBoundary: '실제 사람 배정이 아닌 역할 기반 합성 계획이며 독립 사람 판단 뒤에만 생성됨',
    rights: {
      status: 'inherits-synthetic-observation-rights',
      thirdPartyMediaUsed: false,
      codeLicenseApplies: false,
    },
    usageBoundary,
    createdBySyntheticGenerator: {
      script: 'scripts/generate-synthetic-dataset.mjs',
      seed,
      generatorVersion: DATASET_VERSION,
      deterministic: true,
    },
    tasks: recollectionRecords,
  };
  return {
    reviewEvents,
    recollectionTasks,
    serialized: {
      reviewEvents: stableJson(reviewEvents),
      recollectionTasks: stableJson(recollectionTasks),
    },
  };
}

const evaluationSignalRanges = Object.freeze({
  blur: {
    task_match: ['good', 'review'],
    lighting: ['good', 'review', 'poor'],
    framing: ['good', 'review'],
    blur: ['review', 'poor'],
    privacy_risk: ['none'],
    recommendation: ['retake'],
  },
  occlusion: {
    task_match: ['good', 'review'],
    lighting: ['good', 'review'],
    framing: ['review', 'poor'],
    blur: ['good', 'review'],
    privacy_risk: ['none'],
    recommendation: ['retake'],
  },
  duplicate: {
    task_match: ['good', 'review'],
    lighting: ['good', 'review'],
    framing: ['good', 'review'],
    blur: ['good', 'review'],
    privacy_risk: ['none'],
    recommendation: ['human_review'],
  },
  'out-of-scope': {
    task_match: ['poor'],
    lighting: ['good', 'review'],
    framing: ['review', 'poor'],
    blur: ['good', 'review'],
    privacy_risk: ['none', 'possible'],
    recommendation: ['retake'],
  },
  'safety-risk': {
    task_match: ['review', 'poor'],
    lighting: ['good', 'review'],
    framing: ['good', 'review'],
    blur: ['good', 'review'],
    privacy_risk: ['none'],
    recommendation: ['human_review', 'retake'],
  },
  'consent-rights-unconfirmed': {
    task_match: ['good', 'review'],
    lighting: ['good', 'review'],
    framing: ['good', 'review'],
    blur: ['good', 'review'],
    privacy_risk: ['possible', 'clear'],
    recommendation: ['human_review'],
  },
  'label-mismatch': {
    task_match: ['review', 'poor'],
    lighting: ['good', 'review'],
    framing: ['good', 'review'],
    blur: ['good', 'review'],
    privacy_risk: ['none'],
    recommendation: ['human_review'],
  },
  normal: {
    task_match: ['good'],
    lighting: ['good'],
    framing: ['good'],
    blur: ['good'],
    privacy_risk: ['none'],
    recommendation: ['ready_for_human_review'],
  },
});

const evaluationHumanCheckByIssue = Object.freeze({
  blur: 'focus-and-motion-evidence',
  occlusion: 'full-target-visibility',
  duplicate: 'cross-observation-duplicate-context',
  'out-of-scope': 'approved-task-boundary',
  'safety-risk': 'safe-condition-before-any-recollection',
  'consent-rights-unconfirmed': 'documented-consent-and-use-rights',
  'label-mismatch': 'assigned-label-and-observed-state-alignment',
  normal: 'all-issue-absence-and-normal-exclusivity',
});

function evaluationFailureReason(issue) {
  if (issue.code === 'normal') return null;
  if (issue.expectedQualityLabel === 'recollection-required') return `recollect-${issue.code}`;
  return `hold-${issue.code}-for-independent-human-decision`;
}

function evaluationCase({ scenario, issue, observations, reviewEvents, recollectionTasks }) {
  const sourceObservations = observations.records.filter((record) => (
    record.scenarioId === scenario.id
    && record.issueCodes.length === 1
    && record.issueCodes[0] === issue.code
  ));
  if (sourceObservations.length === 0) {
    throw new Error(`evaluation case lacks a canonical observation for ${scenario.id}:${issue.code}`);
  }
  const sourceObservationIds = sourceObservations.map(({ id }) => id);
  const sourceHumanReviewEventIds = reviewEvents.events.filter((event) => (
    sourceObservationIds.includes(event.observationId)
    && event.eventType === 'independent_human_review'
    && event.decisionAuthority === 'human'
  )).map(({ eventId }) => eventId);
  if (sourceHumanReviewEventIds.length !== sourceObservationIds.length) {
    throw new Error(`evaluation case lacks independent human review evidence for ${scenario.id}:${issue.code}`);
  }
  const sourceRecollectionTaskIds = recollectionTasks.tasks.filter((task) => (
    sourceObservationIds.includes(task.sourceObservationId)
  )).map(({ taskId }) => taskId);
  const recollectionRequired = issue.expectedQualityLabel === 'recollection-required';
  return {
    caseId: `eval-${scenario.id.slice('syn-'.length)}-${issue.code}`,
    scenarioId: scenario.id,
    field: scenario.field,
    issueCode: issue.code,
    sourceObservationIds,
    sourceHumanReviewEventIds,
    sourceRecollectionTaskIds,
    inputMode: 'metadata-only-synthetic-evaluation',
    syntheticPromptSummary: `${scenario.title} (${scenario.taskType})의 합성 메타데이터에서 ${issue.criteria.trigger} 조건을 표현하고 실제 이미지나 현장 정보를 사용하지 않음`,
    expectedAiSignal: {
      schemaRef: 'api/analyze.mjs#analysisSchema',
      signalAuthority: 'assistive-only-no-approval-authority',
      requiredNarrativeFields: ['summary', 'observed_objects', 'reason', 'recollection_guidance'],
      allowedValues: evaluationSignalRanges[issue.code],
      interpretationBoundary: `${issue.name} 조건에 대한 허용 신호 범위이며 실제 모델 호출 결과나 성능 측정이 아니고 사람 검수를 대체하지 않음`,
    },
    requiredHumanChecks: [
      evaluationHumanCheckByIssue[issue.code],
      'scenario-and-task-scope-match',
      'consent-and-rights-status',
      'safety-condition',
      'independent-final-disposition',
    ],
    expectedHumanDisposition: issue.humanReviewDisposition,
    recollectionRequired,
    failureReasonCode: evaluationFailureReason(issue),
    decisionAuthority: 'human',
    sourceType: 'AI-generated synthetic example',
    status: 'metadata-only-synthetic-evaluation-not-executed',
    rights: {
      status: 'clean-room-metadata-project-use',
      thirdPartyMediaUsed: false,
      codeLicenseApplies: false,
    },
    usageBoundary: evaluationUsageBoundary,
    version: DATASET_VERSION,
  };
}

export function buildEvaluationCases({
  seed = DEFAULT_SEED,
  catalog,
  taxonomy,
  observations,
  reviewEvents,
  recollectionTasks,
}) {
  if (!catalog || !Array.isArray(catalog.syntheticExamples)) throw new Error('canonical catalog scenarios are required');
  if (!taxonomy || !Array.isArray(taxonomy.issueCodes)) throw new Error('canonical quality taxonomy is required');
  if (!observations || !Array.isArray(observations.records)) throw new Error('canonical synthetic observations are required');
  if (!reviewEvents || !Array.isArray(reviewEvents.events)) throw new Error('canonical review events are required');
  if (!recollectionTasks || !Array.isArray(recollectionTasks.tasks)) throw new Error('canonical recollection tasks are required');
  if (catalog.syntheticExamples.length !== 12 || taxonomy.issueCodes.length !== 8) {
    throw new Error('evaluation grid requires twelve scenarios and eight quality issue codes');
  }
  const cases = catalog.syntheticExamples.flatMap((scenario) => taxonomy.issueCodes.map((issue) => evaluationCase({
    scenario,
    issue,
    observations,
    reviewEvents,
    recollectionTasks,
  })));
  const evaluationCases = {
    schemaVersion: '1.0.0',
    datasetId: 'naeil-metadata-only-synthetic-evaluation-cases-v1',
    version: DATASET_VERSION,
    seed,
    sourceCatalogRef: 'public/data/catalog.json',
    qualityTaxonomyRef: 'public/data/quality-taxonomy.json',
    sourceObservationDatasetRef: 'public/data/synthetic-observations.json',
    reviewEventsRef: 'public/data/review-events.json',
    recollectionTasksRef: 'public/data/recollection-tasks.json',
    inputMode: 'metadata-only-synthetic-evaluation',
    sourceType: 'AI-generated synthetic example',
    status: 'deterministic-evaluation-contract-not-model-run',
    scenarioCount: catalog.syntheticExamples.length,
    issueCodeCount: taxonomy.issueCodes.length,
    caseCount: cases.length,
    decisionBoundary: 'AI는 보조 신호 범위만 제시하고 승인 권한은 없으며 모든 case의 최종 판단은 독립 사람 검수자가 수행함',
    measurementBoundary: '실제 모델을 실행하거나 정확도·점수·성능을 측정하지 않은 재현 가능한 metadata-only 평가 계약임',
    rights: {
      status: 'clean-room-metadata-project-use',
      thirdPartyMediaUsed: false,
      codeLicenseApplies: false,
    },
    usageBoundary: evaluationUsageBoundary,
    createdBySyntheticGenerator: {
      script: 'scripts/generate-synthetic-dataset.mjs',
      seed,
      generatorVersion: DATASET_VERSION,
      deterministic: true,
      modelExecuted: false,
    },
    cases,
  };
  return {
    evaluationCases,
    serialized: stableJson(evaluationCases),
  };
}

function careerRights() {
  return {
    status: 'clean-room-synthetic-demonstration-record',
    thirdPartyMediaUsed: false,
    codeLicenseApplies: false,
  };
}

function roleNumber(roleId) {
  return roleId.match(/^occ-(\d{3})-/)?.[1] ?? '000';
}

function roleCompetencies(curriculum) {
  return [...new Set(curriculum.modules.flatMap((module) => module.competencyCodes))];
}

export function buildTrainingCareerArtifacts({
  seed = DEFAULT_SEED,
  catalog,
  observations,
  reviewEvents,
  recollectionTasks,
}) {
  if (!catalog || !Array.isArray(catalog.occupationPaths) || !Array.isArray(catalog.syntheticExamples)) {
    throw new Error('canonical catalog roles and scenarios are required');
  }
  if (!observations || !Array.isArray(observations.records)) {
    throw new Error('canonical synthetic observations are required');
  }
  if (!reviewEvents || !Array.isArray(reviewEvents.events)) {
    throw new Error('canonical review events are required');
  }
  if (!recollectionTasks || !Array.isArray(recollectionTasks.tasks)) {
    throw new Error('canonical recollection tasks are required');
  }
  const roles = catalog.occupationPaths;
  const scenarios = catalog.syntheticExamples;
  if (roles.length !== 6 || scenarios.length !== 12) {
    throw new Error('canonical catalog must contain six roles and twelve scenarios');
  }
  for (const role of roles) {
    if (!roleCurricula[role.id]) throw new Error(`missing curriculum for ${role.id}`);
  }

  const modules = roles.flatMap((role) => roleCurricula[role.id].modules.map((module) => ({
    moduleId: module.id,
    targetRoleId: role.id,
    title: module.title,
    competencyCodes: module.competencyCodes,
    topics: module.topics,
    learningObjective: module.learningObjective,
    evidenceMode: 'synthetic-scenario-demonstration-only',
    completionClaim: 'not-completed-no-real-learner',
    certificationClaim: false,
    sourceType: 'AI-generated synthetic example',
    status: 'proposed-demonstration-training-module',
    rights: careerRights(),
    usageBoundary: careerUsageBoundary,
    version: DATASET_VERSION,
  })));
  const trainingCatalog = {
    schemaVersion: '1.0.0',
    catalogId: 'naeil-synthetic-training-catalog-v1',
    version: DATASET_VERSION,
    seed,
    sourceCatalogRef: 'public/data/catalog.json',
    sourceType: 'AI-generated synthetic example',
    status: 'proposed-demonstration-curriculum-not-completion',
    proposedRoleCount: roles.length,
    moduleCount: modules.length,
    proposedRoles: roles.map((role) => ({
      roleId: role.id,
      name: role.name,
      englishName: roleCurricula[role.id].englishName,
      status: 'proposed-occupation-path-not-employment-outcome',
    })),
    competencyCatalog,
    completionBoundary: '모든 모듈은 제안된 합성 학습 설계이며 실제 교육 수료, 자격 또는 고용 성과가 아님',
    rights: careerRights(),
    usageBoundary: careerUsageBoundary,
    createdBySyntheticGenerator: {
      script: 'scripts/generate-synthetic-dataset.mjs',
      seed,
      generatorVersion: DATASET_VERSION,
      deterministic: true,
    },
    modules,
  };

  const mappings = roles.flatMap((role) => {
    const curriculum = roleCurricula[role.id];
    const moduleIds = curriculum.modules.map((module) => module.id);
    const competencyCodes = roleCompetencies(curriculum);
    return scenarios.map((scenario) => ({
      mappingId: `rolemap-${roleNumber(role.id)}-${scenario.id.slice('syn-'.length)}`,
      proposedRoleId: role.id,
      scenarioId: scenario.id,
      field: scenario.field,
      taskType: scenario.taskType,
      competencyCodes,
      trainingModuleIds: moduleIds,
      allowedContribution: curriculum.allowedContribution,
      authorityBoundary: {
        selfReviewAllowed: false,
        aiApprovalAllowed: false,
        realFieldAssignment: false,
      },
      sourceType: 'AI-generated synthetic example',
      status: 'proposed-role-scenario-mapping',
      rights: careerRights(),
      usageBoundary: careerUsageBoundary,
      version: DATASET_VERSION,
    }));
  });
  const roleTaskMatrix = {
    schemaVersion: '1.0.0',
    matrixId: 'naeil-synthetic-role-task-matrix-v1',
    version: DATASET_VERSION,
    seed,
    sourceCatalogRef: 'public/data/catalog.json',
    trainingCatalogRef: 'public/data/training-catalog.json',
    sourceType: 'AI-generated synthetic example',
    status: 'proposed-role-scenario-matrix',
    proposedRoleCount: roles.length,
    scenarioCount: scenarios.length,
    mappingCount: mappings.length,
    rights: careerRights(),
    usageBoundary: careerUsageBoundary,
    createdBySyntheticGenerator: {
      script: 'scripts/generate-synthetic-dataset.mjs',
      seed,
      generatorVersion: DATASET_VERSION,
      deterministic: true,
    },
    mappings,
  };

  const eventsByObservation = new Map();
  for (const event of reviewEvents.events) {
    if (!eventsByObservation.has(event.observationId)) eventsByObservation.set(event.observationId, {});
    eventsByObservation.get(event.observationId)[event.eventType] = event;
  }
  const recollectionByObservation = new Map(
    recollectionTasks.tasks.map((task) => [task.sourceObservationId, task]),
  );
  const evidenceRecords = observations.records.map((observation, observationIndex) => {
    const role = roles[observationIndex % roles.length];
    const curriculum = roleCurricula[role.id];
    const linkedEvents = eventsByObservation.get(observation.id);
    if (!linkedEvents?.assistive_ai_signal || !linkedEvents?.independent_human_review) {
      throw new Error(`missing review lifecycle for ${observation.id}`);
    }
    const recollection = recollectionByObservation.get(observation.id) ?? null;
    return {
      evidenceId: `evidence-${observation.id.slice('obs-'.length)}`,
      syntheticProfileId: `synthetic-profile-${roleNumber(role.id)}`,
      proposedRoleId: role.id,
      sourceObservationId: observation.id,
      linkedAssistiveSignalEventId: linkedEvents.assistive_ai_signal.eventId,
      linkedReviewEventId: linkedEvents.independent_human_review.eventId,
      recollectionTaskId: recollection?.taskId ?? null,
      field: observation.field,
      scenarioId: observation.scenarioId,
      competencyCodes: roleCompetencies(curriculum),
      trainingModuleIds: curriculum.modules.map((module) => module.id),
      evidenceType: curriculum.evidenceType,
      verificationStatus: 'demonstration-only-reviewed-not-training-completion',
      verifierRole: 'independent-career-evidence-reviewer',
      decisionAuthority: 'human',
      rights: careerRights(),
      usageBoundary: careerUsageBoundary,
      sourceType: 'AI-generated synthetic example',
      status: 'synthetic-demonstration-not-employment-or-credential',
      version: DATASET_VERSION,
    };
  });
  const careerEvidence = {
    schemaVersion: '1.0.0',
    datasetId: 'naeil-synthetic-career-evidence-v1',
    version: DATASET_VERSION,
    seed,
    sourceObservationDatasetRef: 'public/data/synthetic-observations.json',
    reviewEventsRef: 'public/data/review-events.json',
    recollectionTasksRef: 'public/data/recollection-tasks.json',
    trainingCatalogRef: 'public/data/training-catalog.json',
    roleTaskMatrixRef: 'public/data/role-task-matrix.json',
    sourceType: 'AI-generated synthetic example',
    status: 'demonstration-only-career-evidence-not-credential',
    evidenceCount: evidenceRecords.length,
    syntheticProfileCount: new Set(evidenceRecords.map((record) => record.syntheticProfileId)).size,
    verificationBoundary: {
      syntheticProfilesAreRealPeople: false,
      collectorMayVerifyOwnEvidence: false,
      aiMayApproveEvidence: false,
      independentHumanVerifierRequired: true,
    },
    rights: careerRights(),
    usageBoundary: careerUsageBoundary,
    createdBySyntheticGenerator: {
      script: 'scripts/generate-synthetic-dataset.mjs',
      seed,
      generatorVersion: DATASET_VERSION,
      deterministic: true,
    },
    evidence: evidenceRecords,
  };
  return {
    trainingCatalog,
    roleTaskMatrix,
    careerEvidence,
    serialized: {
      trainingCatalog: stableJson(trainingCatalog),
      roleTaskMatrix: stableJson(roleTaskMatrix),
      careerEvidence: stableJson(careerEvidence),
    },
  };
}

const queueVariationDefinitions = [
  {
    variationType: 'baseline-accepted',
    filenameSuffix: 'baseline-accepted',
    targetUse: 'synthetic-baseline-quality-demonstration',
  },
  {
    variationType: 'visible-issue',
    filenameSuffix: 'visible-issue',
    targetUse: 'synthetic-visible-quality-issue-demonstration',
  },
  {
    variationType: 'corrected-recollection',
    filenameSuffix: 'corrected-recollection',
    targetUse: 'synthetic-recollection-correction-demonstration',
  },
];

const visibleIssueCycle = [
  'blur',
  'occlusion',
  'duplicate',
  'out-of-scope',
  'safety-risk',
  'label-mismatch',
];

const imageNegativePrompt = [
  'people',
  'faces',
  'hands or body parts',
  'readable text, letters, or numbers',
  'logos, trademarks, or recognizable branding',
  'store names or contact details',
  'addresses, maps, coordinates, or private location clues',
  'license plates or identity documents',
  'real business exterior or recognizable real premises',
  'watermarks or signatures',
].join('; ');

function promptSha256(fullPrompt) {
  return createHash('sha256').update(fullPrompt, 'utf8').digest('hex');
}

function queueRights() {
  return {
    status: 'pending-generation',
    thirdPartyMediaUsed: false,
    codeLicenseApplies: false,
  };
}

function imageReviewerChecklist(variationType) {
  return [
    { checkId: 'synthetic-boundary', requirement: '합성 예시이며 실제 수집·청년 수행·파트너 현장 자료가 아님을 확인', required: true },
    { checkId: 'privacy-and-site', requirement: '개인정보와 사설 위치·사업장 식별 단서가 없음을 확인', required: true },
    { checkId: 'faces-logos-text', requirement: '얼굴·신체·로고·상표·읽을 수 있는 글자가 없음을 확인', required: true },
    { checkId: 'scenario-scope', requirement: 'canonical scenario의 대상과 허용 범위 안에 있음을 확인', required: true },
    { checkId: 'variation-integrity', requirement: `${variationType}의 품질 상태가 연결된 taxonomy 및 observation과 일치함을 확인`, required: true },
    { checkId: 'provenance-complete', requirement: 'output ID, 파일 sha256, byte length, dimensions 기록 전에는 생성 완료 또는 권리 승인으로 표시하지 않음', required: true },
  ];
}

function imagePrompt({ scenario, variationType, issue, recollectionTask }) {
  const base = [
    'Create a clean-room, photorealistic but unmistakably synthetic 16:9 object-only demonstration image for NAEIL.',
    `Field context: ${scenario.field}; scenario: ${scenario.title}; task type: ${scenario.taskType}.`,
    `Show only ${scenario.primaryObject}, with ${scenario.targetArea} as the clear inspection area, in a generic unbranded interior that cannot identify any real place.`,
  ];
  if (variationType === 'baseline-accepted') {
    base.push('Render a sharp, evenly lit, complete, unique, in-scope baseline frame with no visible safety risk; it remains a synthetic candidate for independent human review, not approved data.');
  } else if (variationType === 'visible-issue') {
    base.push(`Deliberately demonstrate the quality issue ${issue.code}: ${issue.criteria.trigger}. Keep the issue visually evident without adding any person, identity, brand, or real-site detail.`);
  } else {
    base.push(`Render a corrected recollection candidate that resolves ${issue.code} by following this guidance: ${issue.recollectionGuidance}. The frame must be sharp, complete, unique, safely in scope, and still require independent human review.`);
    base.push(`The linked deterministic recollection plan is ${recollectionTask.taskId}; do not render this identifier or any other readable text in the image.`);
  }
  base.push('No people, faces, hands, logos, readable text, private location clues, or recognizable real business exterior. Do not depict actual youth work or a real partner site.');
  return base.join(' ');
}

function completedAssetRecord(completion) {
  return {
    id: completion.assetId,
    field: completion.field,
    title: completion.assetTitle ?? '가공 부품 표면 상태 baseline 합성 대표 이미지',
    filePath: completion.filePath,
    mediaType: completion.mediaType,
    sourceType: completion.sourceType,
    provenanceCompleteness: 'complete-exact-prompt-generator-file-and-human-review',
    completionLedgerRef: `public/data/image-generation-completions.json#${completion.completionId}`,
    promptId: completion.promptId,
    generation: {
      tool: completion.tool,
      sessionType: 'local-imagegen-session',
      localSourceId: completion.generatorOutputId,
      localSourceStatus: 'recorded-in-completion-ledger',
      generatorSessionId: completion.generatorSessionId,
      generatorOutputId: completion.generatorOutputId,
      generatedLocally: true,
      attestationBasis: 'canonical completion ledger with exact prompt, generator identifiers, file integrity, and human visual review',
    },
    prompt: {
      status: 'recorded',
      sha256: completion.promptSha256,
      exactPromptRef: `public/data/image-generation-completions.json#${completion.completionId}.exactPrompt`,
      containsNoPersonalData: 'confirmed-by-human-visual-review',
      containsNoPrivateSiteDetails: 'confirmed-by-human-visual-review',
    },
    file: completion.file,
    humanReview: completion.humanReview,
    rights: completion.rights,
    syntheticBoundary: completion.syntheticBoundary,
  };
}

export function buildAssetManifestWithCompletions({ assetManifest, completionLedger }) {
  if (!assetManifest || !Array.isArray(assetManifest.assets)) {
    throw new Error('canonical asset manifest is required');
  }
  if (!completionLedger || !Array.isArray(completionLedger.completions)) {
    throw new Error('canonical image generation completion ledger is required');
  }
  if (completionLedger.completionCount !== completionLedger.completions.length) {
    throw new Error('completion ledger count does not match its records');
  }
  const completionAssetIds = new Set();
  const completionPromptIds = new Set();
  for (const completion of completionLedger.completions) {
    if (completionAssetIds.has(completion.assetId)) throw new Error(`duplicate completion asset ID ${completion.assetId}`);
    if (completionPromptIds.has(completion.promptId)) throw new Error(`duplicate completion prompt ID ${completion.promptId}`);
    completionAssetIds.add(completion.assetId);
    completionPromptIds.add(completion.promptId);
    if (promptSha256(completion.exactPrompt) !== completion.promptSha256) {
      throw new Error(`completion prompt hash mismatch for ${completion.promptId}`);
    }
    if (completion.status !== 'generated-human-reviewed-for-prototype-use') {
      throw new Error(`completion status is not prototype-reviewed for ${completion.promptId}`);
    }
    if (completion.rights?.status !== 'project-use-granted') {
      throw new Error(`completion rights are not project-use-granted for ${completion.promptId}`);
    }
    if (!Object.values(completion.syntheticBoundary ?? {}).every((value) => value === true)) {
      throw new Error(`completion synthetic boundary is incomplete for ${completion.promptId}`);
    }
  }
  return {
    ...assetManifest,
    assets: [
      ...assetManifest.assets.filter(({ id }) => !completionAssetIds.has(id)),
      ...completionLedger.completions.map(completedAssetRecord),
    ],
  };
}

async function validateCompletionFiles(completionLedger) {
  for (const completion of completionLedger.completions) {
    const absolutePath = path.resolve(projectRoot, completion.filePath);
    const generatedAssetsRoot = path.resolve(projectRoot, 'public/assets/generated');
    if (!absolutePath.startsWith(`${generatedAssetsRoot}${path.sep}`)) {
      throw new Error(`completion file escapes generated assets directory: ${completion.filePath}`);
    }
    const bytes = await readFile(absolutePath);
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest !== completion.file.sha256) throw new Error(`completion file hash mismatch for ${completion.promptId}`);
    if (bytes.length !== completion.file.byteLength) throw new Error(`completion byte length mismatch for ${completion.promptId}`);
    const pngSignature = '89504e470d0a1a0a';
    if (bytes.subarray(0, 8).toString('hex') !== pngSignature) throw new Error(`completion is not a PNG for ${completion.promptId}`);
    const pixelWidth = bytes.readUInt32BE(16);
    const pixelHeight = bytes.readUInt32BE(20);
    if (pixelWidth !== completion.file.pixelWidth || pixelHeight !== completion.file.pixelHeight) {
      throw new Error(`completion dimensions mismatch for ${completion.promptId}`);
    }
  }
}

export function buildImageGenerationArtifacts({
  seed = DEFAULT_SEED,
  catalog,
  taxonomy,
  observations,
  recollectionTasks,
  assetManifest,
  completionLedger,
}) {
  if (!catalog || !Array.isArray(catalog.syntheticExamples)) {
    throw new Error('canonical catalog scenarios are required');
  }
  if (!taxonomy || !Array.isArray(taxonomy.issueCodes)) {
    throw new Error('canonical quality taxonomy is required');
  }
  if (!observations || !Array.isArray(observations.records)) {
    throw new Error('canonical synthetic observations are required');
  }
  if (!recollectionTasks || !Array.isArray(recollectionTasks.tasks)) {
    throw new Error('canonical recollection tasks are required');
  }
  if (!assetManifest || !Array.isArray(assetManifest.assets)) {
    throw new Error('canonical asset manifest is required');
  }
  if (!completionLedger || !Array.isArray(completionLedger.completions)) {
    throw new Error('canonical image generation completion ledger is required');
  }
  const scenarios = catalog.syntheticExamples;
  if (scenarios.length !== 12) throw new Error('canonical catalog must contain twelve scenarios');
  const expectedManifestAssetCount = 3 + completionLedger.completions.length;
  if (assetManifest.assets.length !== expectedManifestAssetCount) {
    throw new Error(`derived asset manifest must contain ${expectedManifestAssetCount} assets`);
  }
  const taxonomyByCode = new Map(taxonomy.issueCodes.map((issue) => [issue.code, issue]));
  const tasksByObservation = new Map(
    recollectionTasks.tasks.map((task) => [task.sourceObservationId, task]),
  );
  const plannedItems = scenarios.flatMap((scenario, scenarioIndex) => {
    const scenarioObservations = observations.records.filter((record) => record.scenarioId === scenario.id);
    const baselineObservation = scenarioObservations.find((record) => (
      record.issueCodes.length === 1 && record.issueCodes[0] === 'normal'
    ));
    const issueCode = visibleIssueCycle[scenarioIndex % visibleIssueCycle.length];
    const issueObservation = scenarioObservations.find((record) => (
      record.issueCodes.length === 1 && record.issueCodes[0] === issueCode
    ));
    const issue = taxonomyByCode.get(issueCode);
    const recollectionTask = tasksByObservation.get(issueObservation?.id);
    if (!baselineObservation || !issueObservation || !issue || !recollectionTask) {
      throw new Error(`canonical image-generation references are incomplete for ${scenario.id}`);
    }
    return queueVariationDefinitions.map((variation) => {
      const isBaseline = variation.variationType === 'baseline-accepted';
      const fullPrompt = imagePrompt({
        scenario: {
          ...scenario,
          primaryObject: baselineObservation.observableAttributes.primaryObject,
          targetArea: baselineObservation.observableAttributes.targetArea,
        },
        variationType: variation.variationType,
        issue,
        recollectionTask,
      });
      return {
        promptId: `imgprompt-${scenario.id.slice('syn-'.length)}-${variation.filenameSuffix}`,
        scenarioId: scenario.id,
        field: scenario.field,
        variationType: variation.variationType,
        linkedIssueCodes: isBaseline ? ['normal'] : [issueCode],
        linkedObservationIds: [isBaseline ? baselineObservation.id : issueObservation.id],
        linkedRecollectionTaskIds: variation.variationType === 'corrected-recollection'
          ? [recollectionTask.taskId]
          : [],
        intendedFilename: `${scenario.id}-${variation.filenameSuffix}.png`,
        targetAspectRatio: '16:9',
        targetUse: variation.targetUse,
        fullPrompt,
        negativePrompt: imageNegativePrompt,
        generationStatus: 'planned-not-generated',
        sourceType: 'AI-generated synthetic example',
        rightsStatus: 'pending-generation',
        permittedUses: [
          'NAEIL prototype synthetic illustration after provenance and rights review',
          'quality and recollection workflow demonstration after provenance and rights review',
        ],
        prohibitedUses: [
          'claiming real field collection, youth work, or partner-site data',
          'claiming approved model-training data',
          'claiming rights approval before post-generation review',
          'identifying or representing a real person, business, or private site',
        ],
        containsNoPersonalData: true,
        containsNoPrivateSiteDetails: true,
        noFaces: true,
        noLogos: true,
        noReadableText: true,
        provenanceCapture: {
          promptHashAlgorithm: 'sha256-utf8-fullPrompt-exact-bytes',
          promptSha256: promptSha256(fullPrompt),
          generatorTool: null,
          generatorSessionId: null,
          generatorOutputId: null,
          fileSha256: null,
          byteLength: null,
          dimensions: null,
          captureStatus: 'awaiting-generation',
        },
        reviewerChecklist: imageReviewerChecklist(variation.variationType),
        reviewExpectation: 'independent-human-review-required-after-generation',
        rights: queueRights(),
        usageBoundary: imageQueueUsageBoundary,
        version: DATASET_VERSION,
      };
    });
  });
  const completionsByPrompt = new Map(completionLedger.completions.map((completion) => [completion.promptId, completion]));
  const items = plannedItems.map((item) => {
    const completion = completionsByPrompt.get(item.promptId);
    if (!completion) return item;
    if (completion.scenarioId !== item.scenarioId || completion.field !== item.field || completion.variationType !== item.variationType) {
      throw new Error(`completion queue identity mismatch for ${item.promptId}`);
    }
    if (path.basename(completion.filePath) !== item.intendedFilename) {
      throw new Error(`completion filename mismatch for ${item.promptId}`);
    }
    return {
      ...item,
      fullPrompt: completion.exactPrompt,
      generationStatus: completion.status,
      rightsStatus: completion.rights.status,
      permittedUses: completion.rights.permittedUses,
      prohibitedUses: completion.rights.prohibitedUses,
      provenanceCapture: {
        promptHashAlgorithm: 'sha256-utf8-fullPrompt-exact-bytes',
        promptSha256: completion.promptSha256,
        generatorTool: completion.tool,
        generatorSessionId: completion.generatorSessionId,
        generatorOutputId: completion.generatorOutputId,
        fileSha256: completion.file.sha256,
        byteLength: completion.file.byteLength,
        dimensions: {
          pixelWidth: completion.file.pixelWidth,
          pixelHeight: completion.file.pixelHeight,
        },
        captureStatus: 'complete-human-reviewed-prototype-use',
      },
      completionId: completion.completionId,
      generatedAssetId: completion.assetId,
      filePath: completion.filePath,
      humanReview: completion.humanReview,
      reviewExpectation: 'human-review-completed-for-prototype-use',
      rights: {
        status: completion.rights.status,
        thirdPartyMediaUsed: false,
        codeLicenseApplies: completion.rights.codeLicenseApplies,
      },
      usageBoundary: completion.usageBoundary,
    };
  });
  for (const completion of completionLedger.completions) {
    if (!items.some(({ promptId }) => promptId === completion.promptId)) {
      throw new Error(`completion references unknown queue prompt ${completion.promptId}`);
    }
  }
  const generatedItems = items.filter(({ generationStatus }) => generationStatus === 'generated-human-reviewed-for-prototype-use');
  const plannedItemsRemaining = items.filter(({ generationStatus }) => generationStatus === 'planned-not-generated');
  const imageGenerationQueue = {
    schemaVersion: '1.0.0',
    queueId: 'naeil-synthetic-image-generation-queue-v1',
    version: DATASET_VERSION,
    seed,
    sourceCatalogRef: 'public/data/catalog.json',
    qualityTaxonomyRef: 'public/data/quality-taxonomy.json',
    sourceObservationDatasetRef: 'public/data/synthetic-observations.json',
    recollectionTasksRef: 'public/data/recollection-tasks.json',
    completionLedgerRef: 'public/data/image-generation-completions.json',
    rightsPolicyRef: 'public/data/image-rights-policy.json',
    assetManifestRef: 'public/assets/asset-manifest.json',
    sourceType: 'AI-generated synthetic example',
    status: 'mixed-generated-and-planned-synthetic-images',
    scenarioCount: scenarios.length,
    variationsPerScenario: queueVariationDefinitions.length,
    itemCount: items.length,
    plannedItemCount: plannedItemsRemaining.length,
    generatedItemCount: generatedItems.length,
    rightsApprovedItemCount: generatedItems.filter(({ rightsStatus }) => rightsStatus === 'project-use-granted').length,
    rights: {
      status: 'mixed-pending-generation-and-project-use-granted',
      thirdPartyMediaUsed: false,
      codeLicenseApplies: false,
    },
    usageBoundary: imageQueueUsageBoundary,
    createdBySyntheticGenerator: {
      script: 'scripts/generate-synthetic-dataset.mjs',
      seed,
      generatorVersion: DATASET_VERSION,
      deterministic: true,
      performsImageGeneration: false,
    },
    items,
  };

  const policyItems = [
    {
      policyItemId: 'image-policy-001-pre-generation-review',
      phase: 'pre-generation',
      requirement: 'scenario 범위, synthetic boundary, 개인정보·사설 위치·얼굴·로고·readable text 금지 조건을 독립 검토',
    },
    {
      policyItemId: 'image-policy-002-prompt-hash',
      phase: 'pre-generation',
      requirement: 'fullPrompt UTF-8 exact bytes의 SHA-256을 생성 전 기록하고 변경 시 새 promptId 또는 version 사용',
    },
    {
      policyItemId: 'image-policy-003-output-identity',
      phase: 'post-generation',
      requirement: '실제 generator tool, session ID, output ID를 생성 응답 근거로 기록하며 추정값을 금지',
    },
    {
      policyItemId: 'image-policy-004-file-integrity',
      phase: 'post-generation',
      requirement: '실제 파일에서 SHA-256, byte length, pixel width, pixel height를 계산하여 기록',
    },
    {
      policyItemId: 'image-policy-005-post-generation-review',
      phase: 'post-generation',
      requirement: 'prompt 준수, 금지 요소 부재, taxonomy variation 정합, 시각적 안전성을 독립 사람이 확인',
    },
    {
      policyItemId: 'image-policy-006-rights-decision',
      phase: 'post-generation',
      requirement: '출처와 허용 용도가 확인되기 전 pending-generation 상태를 유지하며 코드 라이선스와 이미지 권리를 분리',
    },
    {
      policyItemId: 'image-policy-007-synthetic-boundary',
      phase: 'publication',
      requirement: '실제 수집·청년 수행·파트너 자료·승인 학습 데이터로 표현하지 않고 AI-generated synthetic example 라벨 유지',
    },
    {
      policyItemId: 'image-policy-008-removal-replacement',
      phase: 'remediation',
      requirement: '금지 요소, 권리 불명확, provenance 누락, 파일 불일치 발견 시 제거·대체하고 이전 기록의 사유와 상태를 보존',
    },
  ];
  const imageRightsPolicy = {
    schemaVersion: '1.0.0',
    policyId: 'naeil-synthetic-image-rights-policy-v1',
    version: DATASET_VERSION,
    sourceType: 'AI-generated synthetic example',
    status: 'active-policy-for-planned-and-generated-synthetic-images',
    imageGenerationQueueRef: 'public/data/image-generation-queue.json',
    assetManifestRef: 'public/assets/asset-manifest.json',
    policyItemCount: policyItems.length,
    policyItems,
    provenanceCaptureContract: {
      preGenerationRequired: ['promptId', 'fullPrompt', 'negativePrompt', 'promptSha256', 'scenarioId', 'variationType'],
      postGenerationRequired: ['generatorTool', 'generatorSessionId', 'generatorOutputId', 'fileSha256', 'byteLength', 'pixelWidth', 'pixelHeight'],
      promptHashRule: 'SHA-256 over the exact UTF-8 bytes of fullPrompt; no normalization or whitespace change',
      fileHashRule: 'SHA-256 over the generated file bytes',
      unknownValuesRule: '생성·검증 전 값은 null로 유지하고 추정하거나 기존 자산 값을 재사용하지 않음',
    },
    preGenerationReview: {
      requiredStatus: 'planned-not-generated',
      requiredRightsStatus: 'pending-generation',
      checks: ['scenario-scope', 'taxonomy-reference', 'privacy', 'private-site', 'faces', 'logos', 'readable-text', 'synthetic-boundary'],
      decisionAuthority: 'independent-human-reviewer',
    },
    postGenerationReview: {
      requiredEvidence: ['generator-output-identity', 'file-integrity', 'dimensions', 'prompt-compliance', 'rights-basis'],
      decisionAuthority: 'independent-human-reviewer',
      generatorMaySelfApprove: false,
      collectorMaySelfApprove: false,
      allowedNextStates: ['rights-reviewed-project-use', 'rejected-remove-or-replace'],
    },
    syntheticBoundary: {
      notFieldCollection: true,
      notYouthWork: true,
      notPartnerData: true,
      notApprovedTrainingData: true,
      notRealBusinessEvidence: true,
    },
    existingAssetHandling: {
      existingAssetCount: assetManifest.assets.length,
      partialProvenanceAssetCount: assetManifest.assets.filter(({ provenanceCompleteness }) => provenanceCompleteness === 'partial-full-prompt-not-recorded').length,
      completeProvenanceAssetCount: assetManifest.assets.filter(({ provenanceCompleteness }) => provenanceCompleteness === 'complete-exact-prompt-generator-file-and-human-review').length,
      manifestRemainsCanonical: true,
      queueGeneratorMayModifyManifest: false,
      queueGeneratorMayBackfillMissingPrompt: false,
      provenanceStatus: `preserve-three-partial-records-and-${completionLedger.completions.length}-ledger-complete-records-honestly`,
      boundary: `기존 3개 자산의 partial prompt provenance는 변경·추정하지 않고 completion ledger 자산 ${completionLedger.completions.length}건만 완전 provenance로 구분함`,
    },
    removalReplacementProcedure: {
      triggers: ['personal-data-or-face', 'private-site-detail', 'logo-or-readable-text', 'rights-unclear', 'provenance-incomplete', 'hash-or-dimension-mismatch'],
      steps: [
        '노출 및 사용을 중단하고 affected asset 또는 queue item을 rejected-remove-or-replace로 표시',
        '관련 promptId, output ID, file hash와 검수 사유를 보존하되 금지 콘텐츠 자체를 재배포하지 않음',
        '수정 prompt에는 새 version을 부여하고 재생성 후 독립 사람 검수를 반복',
        '대체 파일의 새 output ID, SHA-256, byte length, dimensions와 권리 결정을 기록',
        '이전 파일을 승인 자산으로 참조하지 않도록 manifest와 배포 allowlist 후보를 재검토',
      ],
    },
    rights: {
      status: 'policy-metadata-clean-room-authored',
      thirdPartyMediaUsed: false,
      codeLicenseApplies: false,
    },
    usageBoundary: imageQueueUsageBoundary,
  };
  return {
    imageGenerationQueue,
    imageRightsPolicy,
    serialized: {
      imageGenerationQueue: stableJson(imageGenerationQueue),
      imageRightsPolicy: stableJson(imageRightsPolicy),
    },
  };
}

function datasetDiscoveryRights() {
  return {
    status: 'clean-room-deterministic-discovery-metadata',
    thirdPartyMediaUsed: false,
    codeLicenseApplies: false,
  };
}

function serializedIntegrity(raw) {
  return {
    sha256: createHash('sha256').update(raw, 'utf8').digest('hex'),
    byteLength: Buffer.byteLength(raw, 'utf8'),
  };
}

function combinationCoverage({ combinationId, expectedKeys, actualKeys }) {
  const actual = new Set(actualKeys);
  const missingKeys = expectedKeys.filter((key) => !actual.has(key));
  return {
    combinationId,
    expectedCount: expectedKeys.length,
    actualCount: expectedKeys.length - missingKeys.length,
    missingCount: missingKeys.length,
    missingKeys,
  };
}

export function buildDatasetDiscoveryArtifacts({
  seed = DEFAULT_SEED,
  documents,
  serialized,
  assetManifest,
}) {
  const requiredKeys = [
    'catalog',
    'taxonomy',
    'observations',
    'reviewEvents',
    'recollectionTasks',
    'evaluationCases',
    'trainingCatalog',
    'roleTaskMatrix',
    'careerEvidence',
    'imageGenerationCompletions',
    'imageGenerationQueue',
    'imageRightsPolicy',
  ];
  for (const key of requiredKeys) {
    if (!documents?.[key] || typeof serialized?.[key] !== 'string') {
      throw new Error(`canonical document and serialized bytes are required for ${key}`);
    }
  }
  if (!assetManifest || !Array.isArray(assetManifest.assets)) {
    throw new Error('canonical asset manifest is required for dataset coverage');
  }

  const {
    catalog,
    taxonomy,
    observations,
    reviewEvents,
    recollectionTasks,
    evaluationCases,
    trainingCatalog,
    roleTaskMatrix,
    careerEvidence,
    imageGenerationCompletions,
    imageGenerationQueue,
  } = documents;
  const fieldIds = [...new Set(catalog.syntheticExamples.map(({ field }) => field))];
  const scenarioIds = catalog.syntheticExamples.map(({ id }) => id);
  const qualityCodes = taxonomy.issueCodes.map(({ code }) => code);
  const proposedRoleIds = catalog.occupationPaths.map(({ id }) => id);
  const readinessGateNames = catalog.collectionGates.map(({ name }) => name);
  const eventTypes = ['assistive_ai_signal', 'independent_human_review'];
  const variationTypes = ['baseline-accepted', 'visible-issue', 'corrected-recollection'];
  const nonNormalObservations = observations.records.filter((record) => (
    record.issueCodes.some((code) => code !== 'normal')
  ));

  const fieldCoverage = fieldIds.map((field) => {
    const fieldScenarios = new Set(catalog.syntheticExamples.filter((scenario) => scenario.field === field).map(({ id }) => id));
    return {
      field,
      scenarioCount: fieldScenarios.size,
      observationCount: observations.records.filter((record) => record.field === field).length,
      reviewEventCount: reviewEvents.events.filter((event) => event.field === field).length,
      recollectionTaskCount: recollectionTasks.tasks.filter((task) => task.field === field).length,
      evaluationCaseCount: evaluationCases.cases.filter((evaluationCase) => evaluationCase.field === field).length,
      roleTaskMappingCount: roleTaskMatrix.mappings.filter((mapping) => mapping.field === field).length,
      careerEvidenceCount: careerEvidence.evidence.filter((evidence) => evidence.field === field).length,
      plannedImageSlotCount: imageGenerationQueue.items.filter((item) => item.field === field).length,
      imageGenerationCompletionCount: imageGenerationCompletions.completions.filter((completion) => completion.field === field).length,
      generatedQueueOutputCount: imageGenerationQueue.items.filter((item) => (
        item.field === field && item.generationStatus === 'generated-human-reviewed-for-prototype-use'
      )).length,
    };
  });
  const scenarioCoverage = catalog.syntheticExamples.map((scenario) => ({
    scenarioId: scenario.id,
    field: scenario.field,
    observationCount: observations.records.filter((record) => record.scenarioId === scenario.id).length,
    reviewEventCount: reviewEvents.events.filter((event) => event.scenarioId === scenario.id).length,
    recollectionTaskCount: recollectionTasks.tasks.filter((task) => task.scenarioId === scenario.id).length,
    evaluationCaseCount: evaluationCases.cases.filter((evaluationCase) => evaluationCase.scenarioId === scenario.id).length,
    roleTaskMappingCount: roleTaskMatrix.mappings.filter((mapping) => mapping.scenarioId === scenario.id).length,
    careerEvidenceCount: careerEvidence.evidence.filter((evidence) => evidence.scenarioId === scenario.id).length,
    plannedImageSlotCount: imageGenerationQueue.items.filter((item) => item.scenarioId === scenario.id).length,
  }));
  const qualityCodeCoverage = taxonomy.issueCodes.map((issue) => ({
    issueCode: issue.code,
    observationCount: observations.records.filter((record) => record.issueCodes.includes(issue.code)).length,
    reviewEventCount: reviewEvents.events.filter((event) => event.issueCodes.includes(issue.code)).length,
    recollectionTaskCount: recollectionTasks.tasks.filter((task) => task.scopedIssueCodes.includes(issue.code)).length,
    evaluationCaseCount: evaluationCases.cases.filter((evaluationCase) => evaluationCase.issueCode === issue.code).length,
    plannedImageSlotCount: imageGenerationQueue.items.filter((item) => item.linkedIssueCodes.includes(issue.code)).length,
  }));
  const proposedRoleCoverage = catalog.occupationPaths.map((role) => ({
    proposedRoleId: role.id,
    status: role.status,
    trainingModuleCount: trainingCatalog.modules.filter((module) => module.targetRoleId === role.id).length,
    roleTaskMappingCount: roleTaskMatrix.mappings.filter((mapping) => mapping.proposedRoleId === role.id).length,
    careerEvidenceCount: careerEvidence.evidence.filter((evidence) => evidence.proposedRoleId === role.id).length,
    outcomeBoundary: role.outcomeBoundary,
  }));
  const readinessGateCoverage = catalog.collectionGates.map((gate) => ({
    gateId: gate.id,
    gateName: gate.name,
    observationApplicabilityCount: observations.records.filter((record) => (
      record.fiveGateApplicability?.[gate.name]?.appliesToEquivalentRealCollection === true
    )).length,
    recollectionReconfirmationCount: recollectionTasks.tasks.filter((task) => (
      task.requiredFiveGates.some((requiredGate) => requiredGate.gate === gate.name)
    )).length,
    completionClaimCount: 0,
    boundary: '합성 레코드의 적용 가능성과 재확인 요구만 집계하며 실제 gate 완료를 뜻하지 않음',
  }));
  const lifecycleStageCoverage = [
    { stageId: 'request', canonicalCount: 0, status: 'not-represented-as-public-data-record' },
    { stageId: 'consent-scope-readiness', canonicalCount: observations.records.filter((record) => (
      record.fiveGateApplicability?.['site-consent'] && record.fiveGateApplicability?.['task-scope']
    )).length, status: 'synthetic-applicability-only-not-completion' },
    { stageId: 'training-assignment', canonicalCount: roleTaskMatrix.mappings.length, supportingTrainingModuleCount: trainingCatalog.modules.length, status: 'proposed-mapping-not-real-assignment-or-completion' },
    { stageId: 'collection', canonicalCount: observations.records.length, status: 'synthetic-observations-not-real-collection' },
    { stageId: 'assistive-ai-signal', canonicalCount: reviewEvents.events.filter((event) => event.eventType === 'assistive_ai_signal').length, status: 'synthetic-assistive-events-no-approval-authority' },
    { stageId: 'independent-human-review', canonicalCount: reviewEvents.events.filter((event) => event.eventType === 'independent_human_review').length, status: 'deterministic-synthetic-review-events' },
    { stageId: 'rights-aware-dataset-version', canonicalCount: 0, status: 'no-approved-training-dataset-version-record' },
    { stageId: 'controlled-use', canonicalCount: 0, status: 'no-real-controlled-use-record' },
    { stageId: 'incident-recollection', canonicalCount: recollectionTasks.tasks.length, status: 'synthetic-recollection-plans-not-field-assignments' },
  ];

  const scenarioQualityExpected = scenarioIds.flatMap((scenarioId) => qualityCodes.map((code) => `${scenarioId}:${code}`));
  const scenarioQualityActual = observations.records.flatMap((record) => (
    record.issueCodes.map((code) => `${record.scenarioId}:${code}`)
  ));
  const roleScenarioExpected = proposedRoleIds.flatMap((roleId) => scenarioIds.map((scenarioId) => `${roleId}:${scenarioId}`));
  const roleScenarioActual = roleTaskMatrix.mappings.map((mapping) => `${mapping.proposedRoleId}:${mapping.scenarioId}`);
  const scenarioVariationExpected = scenarioIds.flatMap((scenarioId) => variationTypes.map((variation) => `${scenarioId}:${variation}`));
  const scenarioVariationActual = imageGenerationQueue.items.map((item) => `${item.scenarioId}:${item.variationType}`);
  const observationReviewExpected = observations.records.flatMap((record) => eventTypes.map((eventType) => `${record.id}:${eventType}`));
  const observationReviewActual = reviewEvents.events.map((event) => `${event.observationId}:${event.eventType}`);
  const nonNormalRecollectionExpected = nonNormalObservations.map(({ id }) => id);
  const nonNormalRecollectionActual = recollectionTasks.tasks.map(({ sourceObservationId }) => sourceObservationId);
  const observationCareerExpected = observations.records.map(({ id }) => id);
  const observationCareerActual = careerEvidence.evidence.map(({ sourceObservationId }) => sourceObservationId);
  const observationGateExpected = observations.records.flatMap((record) => readinessGateNames.map((gate) => `${record.id}:${gate}`));
  const observationGateActual = observations.records.flatMap((record) => readinessGateNames
    .filter((gate) => record.fiveGateApplicability?.[gate]?.appliesToEquivalentRealCollection === true)
    .map((gate) => `${record.id}:${gate}`));
  const evaluationGridExpected = scenarioQualityExpected;
  const evaluationGridActual = evaluationCases.cases.map((evaluationCase) => `${evaluationCase.scenarioId}:${evaluationCase.issueCode}`);
  const combinationCoverageRows = [
    combinationCoverage({ combinationId: 'scenario-quality-code', expectedKeys: scenarioQualityExpected, actualKeys: scenarioQualityActual }),
    combinationCoverage({ combinationId: 'proposed-role-scenario', expectedKeys: roleScenarioExpected, actualKeys: roleScenarioActual }),
    combinationCoverage({ combinationId: 'scenario-image-variation', expectedKeys: scenarioVariationExpected, actualKeys: scenarioVariationActual }),
    combinationCoverage({ combinationId: 'observation-review-event-type', expectedKeys: observationReviewExpected, actualKeys: observationReviewActual }),
    combinationCoverage({ combinationId: 'non-normal-observation-recollection', expectedKeys: nonNormalRecollectionExpected, actualKeys: nonNormalRecollectionActual }),
    combinationCoverage({ combinationId: 'observation-career-evidence', expectedKeys: observationCareerExpected, actualKeys: observationCareerActual }),
    combinationCoverage({ combinationId: 'observation-readiness-gate-applicability', expectedKeys: observationGateExpected, actualKeys: observationGateActual }),
    combinationCoverage({ combinationId: 'scenario-quality-evaluation-case', expectedKeys: evaluationGridExpected, actualKeys: evaluationGridActual }),
  ];
  const plannedNotGeneratedItems = imageGenerationQueue.items.filter((item) => item.generationStatus === 'planned-not-generated');
  const generatedQueueItems = imageGenerationQueue.items.filter((item) => (
    item.provenanceCapture?.generatorOutputId && item.provenanceCapture?.fileSha256
  ));
  const approvedQueueItems = imageGenerationQueue.items.filter((item) => item.rightsStatus !== 'pending-generation');
  const datasetCoverage = {
    schemaVersion: '1.0.0',
    coverageId: 'naeil-synthetic-dataset-coverage-v1',
    version: DATASET_VERSION,
    seed,
    sourceType: 'AI-generated synthetic example',
    status: 'deterministic-canonical-coverage-not-real-world-performance',
    coverageDimensionCount: 10,
    canonicalCounts: {
      fields: fieldIds.length,
      scenarios: scenarioIds.length,
      qualityCodes: qualityCodes.length,
      proposedRoles: proposedRoleIds.length,
      readinessGates: readinessGateNames.length,
      observations: observations.records.length,
      reviewEvents: reviewEvents.events.length,
      recollectionTasks: recollectionTasks.tasks.length,
      evaluationCases: evaluationCases.cases.length,
      trainingModules: trainingCatalog.modules.length,
      roleTaskMappings: roleTaskMatrix.mappings.length,
      careerEvidenceRecords: careerEvidence.evidence.length,
      imageGenerationCompletions: imageGenerationCompletions.completions.length,
      plannedImageQueueItems: imageGenerationQueue.items.length,
    },
    fieldCoverage,
    scenarioCoverage,
    qualityCodeCoverage,
    proposedRoleCoverage,
    readinessGateCoverage,
    lifecycleStageCoverage,
    combinationCoverage: combinationCoverageRows,
    missingCoverage: {
      missingCombinationCount: combinationCoverageRows.reduce((sum, row) => sum + row.missingCount, 0),
      lifecycleStagesWithoutCanonicalRecords: lifecycleStageCoverage.filter(({ canonicalCount }) => canonicalCount === 0).map(({ stageId }) => stageId),
      plannedImageSlotsAwaitingGeneration: plannedNotGeneratedItems.map(({ promptId }) => promptId),
    },
    plannedImageCoverage: {
      plannedSlotCount: imageGenerationQueue.items.length,
      plannedNotGeneratedCount: plannedNotGeneratedItems.length,
      generatedQueueOutputCount: generatedQueueItems.length,
      rightsReviewedQueueOutputCount: approvedQueueItems.length,
      completionLedgerCount: imageGenerationCompletions.completions.length,
      totalManifestAssetCount: assetManifest.assets.length,
      preExistingPartialAssetCount: assetManifest.assets.filter(({ provenanceCompleteness }) => provenanceCompleteness === 'partial-full-prompt-not-recorded').length,
      completeLedgerAssetCount: assetManifest.assets.filter(({ provenanceCompleteness }) => provenanceCompleteness === 'complete-exact-prompt-generator-file-and-human-review').length,
      manifestAssetIds: assetManifest.assets.map(({ id }) => id),
      separationBoundary: `queue ${imageGenerationQueue.items.length}개 중 ${generatedQueueItems.length}개만 completion ledger에 따라 생성·사람 검수·project-use 등록되었고 ${plannedNotGeneratedItems.length}개는 생성 전 계획이며, manifest는 기존 partial provenance 3개와 신규 complete provenance ${imageGenerationCompletions.completions.length}개를 구분함`,
    },
    externalCatalogCoverage: {
      candidateCount: catalog.externalCatalogCandidates.length,
      externalCatalogLinkCount: catalog.externalCatalogCandidates.filter((candidate) => candidate.sourceType === 'External catalog link').length,
      liveApiCount: catalog.externalCatalogCandidates.filter((candidate) => candidate.liveApi === true).length,
      statusCounts: Object.fromEntries([...new Set(catalog.externalCatalogCandidates.map(({ status }) => status))].map((status) => [
        status,
        catalog.externalCatalogCandidates.filter((candidate) => candidate.status === status).length,
      ])),
      boundary: '외부 후보는 링크이며 실제 원본 다운로드 또는 Live API 연동을 뜻하지 않음',
    },
    rights: datasetDiscoveryRights(),
    usageBoundary: datasetDiscoveryUsageBoundary,
    createdBySyntheticGenerator: {
      script: 'scripts/generate-synthetic-dataset.mjs',
      seed,
      generatorVersion: DATASET_VERSION,
      deterministic: true,
      countsDerivedFromCanonicalArtifacts: true,
    },
  };
  const datasetCoverageRaw = stableJson(datasetCoverage);

  const artifactDefinitions = [
    { key: 'catalog', artifactId: 'artifact-catalog', filePath: 'public/data/catalog.json', recordType: 'synthetic-scenario-catalog-entry', recordCount: catalog.syntheticExamples.length, related: ['artifact-synthetic-observations', 'artifact-evaluation-cases', 'artifact-training-catalog', 'artifact-role-task-matrix', 'artifact-image-generation-queue'] },
    { key: 'taxonomy', artifactId: 'artifact-quality-taxonomy', filePath: 'public/data/quality-taxonomy.json', recordType: 'quality-issue-code', recordCount: taxonomy.issueCodes.length, related: ['artifact-synthetic-observations', 'artifact-review-events', 'artifact-recollection-tasks', 'artifact-evaluation-cases', 'artifact-image-generation-queue'] },
    { key: 'observations', artifactId: 'artifact-synthetic-observations', filePath: 'public/data/synthetic-observations.json', recordType: 'synthetic-observation', recordCount: observations.records.length, related: ['artifact-catalog', 'artifact-quality-taxonomy', 'artifact-review-events', 'artifact-recollection-tasks', 'artifact-evaluation-cases', 'artifact-career-evidence', 'artifact-image-generation-queue'] },
    { key: 'reviewEvents', artifactId: 'artifact-review-events', filePath: 'public/data/review-events.json', recordType: 'synthetic-lifecycle-review-event', recordCount: reviewEvents.events.length, related: ['artifact-synthetic-observations', 'artifact-recollection-tasks', 'artifact-evaluation-cases', 'artifact-career-evidence'] },
    { key: 'recollectionTasks', artifactId: 'artifact-recollection-tasks', filePath: 'public/data/recollection-tasks.json', recordType: 'synthetic-recollection-task', recordCount: recollectionTasks.tasks.length, related: ['artifact-synthetic-observations', 'artifact-review-events', 'artifact-evaluation-cases', 'artifact-career-evidence', 'artifact-image-generation-queue'] },
    { key: 'evaluationCases', artifactId: 'artifact-evaluation-cases', filePath: 'public/data/evaluation-cases.json', recordType: 'metadata-only-synthetic-evaluation-case', recordCount: evaluationCases.cases.length, related: ['artifact-catalog', 'artifact-quality-taxonomy', 'artifact-synthetic-observations', 'artifact-review-events', 'artifact-recollection-tasks'] },
    { key: 'trainingCatalog', artifactId: 'artifact-training-catalog', filePath: 'public/data/training-catalog.json', recordType: 'proposed-training-module', recordCount: trainingCatalog.modules.length, related: ['artifact-catalog', 'artifact-role-task-matrix', 'artifact-career-evidence'] },
    { key: 'roleTaskMatrix', artifactId: 'artifact-role-task-matrix', filePath: 'public/data/role-task-matrix.json', recordType: 'proposed-role-scenario-mapping', recordCount: roleTaskMatrix.mappings.length, related: ['artifact-catalog', 'artifact-training-catalog', 'artifact-career-evidence'] },
    { key: 'careerEvidence', artifactId: 'artifact-career-evidence', filePath: 'public/data/career-evidence.json', recordType: 'synthetic-demonstration-career-evidence', recordCount: careerEvidence.evidence.length, related: ['artifact-synthetic-observations', 'artifact-review-events', 'artifact-recollection-tasks', 'artifact-training-catalog', 'artifact-role-task-matrix'] },
    { key: 'imageGenerationCompletions', artifactId: 'artifact-image-generation-completions', filePath: 'public/data/image-generation-completions.json', recordType: 'human-reviewed-image-generation-completion', recordCount: imageGenerationCompletions.completions.length, related: ['artifact-image-generation-queue', 'artifact-image-rights-policy'] },
    { key: 'imageGenerationQueue', artifactId: 'artifact-image-generation-queue', filePath: 'public/data/image-generation-queue.json', recordType: 'synthetic-image-prompt-slot', recordCount: imageGenerationQueue.items.length, related: ['artifact-catalog', 'artifact-quality-taxonomy', 'artifact-synthetic-observations', 'artifact-recollection-tasks', 'artifact-image-generation-completions', 'artifact-image-rights-policy'] },
    { key: 'imageRightsPolicy', artifactId: 'artifact-image-rights-policy', filePath: 'public/data/image-rights-policy.json', recordType: 'image-rights-policy-item', recordCount: documents.imageRightsPolicy.policyItems.length, related: ['artifact-image-generation-completions', 'artifact-image-generation-queue'] },
    { key: 'datasetCoverage', artifactId: 'artifact-dataset-coverage', filePath: 'public/data/dataset-coverage.json', recordType: 'dataset-coverage-dimension', recordCount: datasetCoverage.coverageDimensionCount, related: ['artifact-catalog', 'artifact-quality-taxonomy', 'artifact-synthetic-observations', 'artifact-review-events', 'artifact-recollection-tasks', 'artifact-evaluation-cases', 'artifact-training-catalog', 'artifact-role-task-matrix', 'artifact-career-evidence', 'artifact-image-generation-completions', 'artifact-image-generation-queue', 'artifact-image-rights-policy'] },
  ];
  const indexSourceDocuments = { ...documents, datasetCoverage };
  const indexSourceSerialized = { ...serialized, datasetCoverage: datasetCoverageRaw };
  const entries = artifactDefinitions.map((definition) => {
    const document = indexSourceDocuments[definition.key];
    const integrity = serializedIntegrity(indexSourceSerialized[definition.key]);
    const isCatalog = definition.key === 'catalog';
    return {
      id: definition.artifactId,
      artifactId: definition.artifactId,
      filePath: definition.filePath,
      schemaVersion: document.schemaVersion,
      recordType: definition.recordType,
      recordCount: definition.recordCount,
      sourceType: document.sourceType ?? 'AI-generated synthetic example',
      status: document.status ?? 'catalog-records-retain-individual-source-status',
      rights: document.rights ?? {
        status: 'record-level-rights-preserved',
        thirdPartyMediaUsed: false,
        codeLicenseApplies: false,
      },
      usageBoundary: document.usageBoundary ?? (isCatalog
        ? '각 catalog record의 sourceType·status·rights·usage boundary를 유지하며 외부 후보는 Live API가 아님'
        : datasetDiscoveryUsageBoundary),
      relatedArtifactIds: definition.related,
      sha256: integrity.sha256,
      byteLength: integrity.byteLength,
      version: document.version ?? DATASET_VERSION,
    };
  });
  const indexArtifactIds = artifactDefinitions.map(({ artifactId }) => artifactId);
  entries.push({
    id: 'artifact-dataset-index',
    artifactId: 'artifact-dataset-index',
    filePath: 'public/data/dataset-index.json',
    schemaVersion: '1.0.0',
    recordType: 'dataset-artifact-index-entry',
    recordCount: artifactDefinitions.length + 1,
    sourceType: 'AI-generated synthetic example',
    status: 'deterministic-index-self-integrity-unavailable',
    rights: datasetDiscoveryRights(),
    usageBoundary: datasetDiscoveryUsageBoundary,
    relatedArtifactIds: indexArtifactIds,
    sha256: 'unavailable-self-reference',
    byteLength: null,
    version: DATASET_VERSION,
  });
  const datasetIndex = {
    schemaVersion: '1.0.0',
    indexId: 'naeil-public-dataset-index-v1',
    version: DATASET_VERSION,
    seed,
    sourceType: 'AI-generated synthetic example',
    status: 'deterministic-public-data-index',
    hashAlgorithm: 'sha256',
    hashScope: 'exact UTF-8 file bytes including trailing newline',
    artifactCount: entries.length,
    selfIntegrity: {
      status: 'unavailable-self-reference',
      reason: 'dataset-index.json cannot embed a stable hash or byte length of itself without changing those bytes',
    },
    rights: datasetDiscoveryRights(),
    usageBoundary: datasetDiscoveryUsageBoundary,
    createdBySyntheticGenerator: {
      script: 'scripts/generate-synthetic-dataset.mjs',
      seed,
      generatorVersion: DATASET_VERSION,
      deterministic: true,
    },
    artifacts: entries,
  };
  return {
    datasetCoverage,
    datasetIndex,
    serialized: {
      datasetCoverage: datasetCoverageRaw,
      datasetIndex: stableJson(datasetIndex),
    },
  };
}

export async function buildSyntheticArtifacts({
  seed = DEFAULT_SEED,
  baseCatalog,
  baseAssetManifest,
  baseCompletionLedger,
} = {}) {
  const catalogInput = baseCatalog ?? JSON.parse(await readFile(catalogPath, 'utf8'));
  const assetManifestInput = baseAssetManifest ?? JSON.parse(await readFile(assetManifestPath, 'utf8'));
  const completionLedgerRaw = baseCompletionLedger
    ? stableJson(baseCompletionLedger)
    : await readFile(imageGenerationCompletionsPath, 'utf8');
  const completionLedgerInput = baseCompletionLedger ?? JSON.parse(completionLedgerRaw);
  await validateCompletionFiles(completionLedgerInput);
  const derivedAssetManifest = buildAssetManifestWithCompletions({
    assetManifest: assetManifestInput,
    completionLedger: completionLedgerInput,
  });
  const scenarios = scenarioDefinitions.map(catalogScenario);
  const records = scenarioDefinitions.flatMap((scenario, scenarioIndex) => qualityProfiles.map(
    (profile, profileIndex) => observationRecord(scenario, scenarioIndex, profile, profileIndex, seed),
  ));
  const observations = {
    schemaVersion: '1.0.0',
    datasetId: 'naeil-synthetic-observations-v1',
    version: DATASET_VERSION,
    seed,
    sourceType: 'AI-generated synthetic example',
    status: 'synthetic-not-collected-not-training-approved',
    scenarioCount: scenarios.length,
    recordCount: records.length,
    recordsPerScenario: qualityProfiles.length,
    fieldCounts: {
      manufacturing: records.filter((record) => record.field === 'manufacturing').length,
      'small-business': records.filter((record) => record.field === 'small-business').length,
    },
    qualityTaxonomyRef: 'public/data/quality-taxonomy.json',
    rights: {
      status: 'mixed-project-use-asset-and-clean-room-metadata',
      assetRightsRef: 'public/assets/asset-manifest.json',
      thirdPartyMediaUsed: false,
      codeLicenseApplies: false,
    },
    usageBoundary,
    createdBySyntheticGenerator: {
      script: 'scripts/generate-synthetic-dataset.mjs',
      seed,
      generatorVersion: DATASET_VERSION,
      deterministic: true,
    },
    records,
  };
  const lifecycle = buildSyntheticLifecycle({ seed, observations, taxonomy: qualityTaxonomy });
  const catalog = {
    ...catalogInput,
    syntheticExamples: scenarios,
    syntheticObservationDataset: {
      id: observations.datasetId,
      filePath: 'public/data/synthetic-observations.json',
      qualityTaxonomyPath: 'public/data/quality-taxonomy.json',
      seed,
      version: DATASET_VERSION,
      scenarioCount: scenarios.length,
      recordCount: records.length,
      sourceType: observations.sourceType,
      status: observations.status,
      rights: observations.rights,
      usageBoundary,
    },
  };
  const evaluation = buildEvaluationCases({
    seed,
    catalog,
    taxonomy: qualityTaxonomy,
    observations,
    reviewEvents: lifecycle.reviewEvents,
    recollectionTasks: lifecycle.recollectionTasks,
  });
  const trainingCareer = buildTrainingCareerArtifacts({
    seed,
    catalog,
    observations,
    reviewEvents: lifecycle.reviewEvents,
    recollectionTasks: lifecycle.recollectionTasks,
  });
  const imageGeneration = buildImageGenerationArtifacts({
    seed,
    catalog,
    taxonomy: qualityTaxonomy,
    observations,
    recollectionTasks: lifecycle.recollectionTasks,
    assetManifest: derivedAssetManifest,
    completionLedger: completionLedgerInput,
  });
  const serializedArtifacts = {
    catalog: stableJson(catalog),
    observations: stableJson(observations),
    taxonomy: stableJson(qualityTaxonomy),
    ...lifecycle.serialized,
    evaluationCases: evaluation.serialized,
    ...trainingCareer.serialized,
    imageGenerationCompletions: completionLedgerRaw,
    ...imageGeneration.serialized,
  };
  const discovery = buildDatasetDiscoveryArtifacts({
    seed,
    documents: {
      catalog,
      taxonomy: qualityTaxonomy,
      observations,
      reviewEvents: lifecycle.reviewEvents,
      recollectionTasks: lifecycle.recollectionTasks,
      evaluationCases: evaluation.evaluationCases,
      trainingCatalog: trainingCareer.trainingCatalog,
      roleTaskMatrix: trainingCareer.roleTaskMatrix,
      careerEvidence: trainingCareer.careerEvidence,
      imageGenerationCompletions: completionLedgerInput,
      imageGenerationQueue: imageGeneration.imageGenerationQueue,
      imageRightsPolicy: imageGeneration.imageRightsPolicy,
    },
    serialized: serializedArtifacts,
    assetManifest: derivedAssetManifest,
  });
  return {
    catalog,
    observations,
    taxonomy: qualityTaxonomy,
    reviewEvents: lifecycle.reviewEvents,
    recollectionTasks: lifecycle.recollectionTasks,
    evaluationCases: evaluation.evaluationCases,
    trainingCatalog: trainingCareer.trainingCatalog,
    roleTaskMatrix: trainingCareer.roleTaskMatrix,
    careerEvidence: trainingCareer.careerEvidence,
    imageGenerationCompletions: completionLedgerInput,
    imageGenerationQueue: imageGeneration.imageGenerationQueue,
    imageRightsPolicy: imageGeneration.imageRightsPolicy,
    datasetCoverage: discovery.datasetCoverage,
    datasetIndex: discovery.datasetIndex,
    assetManifest: derivedAssetManifest,
    serialized: {
      ...serializedArtifacts,
      ...discovery.serialized,
      assetManifest: stableJson(derivedAssetManifest),
    },
  };
}

export async function writeSyntheticArtifacts({ seed = DEFAULT_SEED } = {}) {
  const artifacts = await buildSyntheticArtifacts({ seed });
  await writeFile(assetManifestPath, artifacts.serialized.assetManifest);
  await writeFile(catalogPath, artifacts.serialized.catalog);
  await writeFile(observationsPath, artifacts.serialized.observations);
  await writeFile(taxonomyPath, artifacts.serialized.taxonomy);
  const canonicalObservations = JSON.parse(await readFile(observationsPath, 'utf8'));
  const canonicalTaxonomy = JSON.parse(await readFile(taxonomyPath, 'utf8'));
  const lifecycle = buildSyntheticLifecycle({
    seed,
    observations: canonicalObservations,
    taxonomy: canonicalTaxonomy,
  });
  await writeFile(reviewEventsPath, lifecycle.serialized.reviewEvents);
  await writeFile(recollectionTasksPath, lifecycle.serialized.recollectionTasks);
  const canonicalCatalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const canonicalReviewEvents = JSON.parse(await readFile(reviewEventsPath, 'utf8'));
  const canonicalRecollectionTasks = JSON.parse(await readFile(recollectionTasksPath, 'utf8'));
  const canonicalAssetManifest = JSON.parse(await readFile(assetManifestPath, 'utf8'));
  const canonicalCompletionLedgerRaw = await readFile(imageGenerationCompletionsPath, 'utf8');
  const canonicalCompletionLedger = JSON.parse(canonicalCompletionLedgerRaw);
  const evaluation = buildEvaluationCases({
    seed,
    catalog: canonicalCatalog,
    taxonomy: canonicalTaxonomy,
    observations: canonicalObservations,
    reviewEvents: canonicalReviewEvents,
    recollectionTasks: canonicalRecollectionTasks,
  });
  await writeFile(evaluationCasesPath, evaluation.serialized);
  const trainingCareer = buildTrainingCareerArtifacts({
    seed,
    catalog: canonicalCatalog,
    observations: canonicalObservations,
    reviewEvents: canonicalReviewEvents,
    recollectionTasks: canonicalRecollectionTasks,
  });
  await writeFile(trainingCatalogPath, trainingCareer.serialized.trainingCatalog);
  await writeFile(roleTaskMatrixPath, trainingCareer.serialized.roleTaskMatrix);
  await writeFile(careerEvidencePath, trainingCareer.serialized.careerEvidence);
  const imageGeneration = buildImageGenerationArtifacts({
    seed,
    catalog: canonicalCatalog,
    taxonomy: canonicalTaxonomy,
    observations: canonicalObservations,
    recollectionTasks: canonicalRecollectionTasks,
    assetManifest: canonicalAssetManifest,
    completionLedger: canonicalCompletionLedger,
  });
  await writeFile(imageGenerationQueuePath, imageGeneration.serialized.imageGenerationQueue);
  await writeFile(imageRightsPolicyPath, imageGeneration.serialized.imageRightsPolicy);
  const canonicalDataSpecs = [
    ['catalog', catalogPath],
    ['taxonomy', taxonomyPath],
    ['observations', observationsPath],
    ['reviewEvents', reviewEventsPath],
    ['recollectionTasks', recollectionTasksPath],
    ['evaluationCases', evaluationCasesPath],
    ['trainingCatalog', trainingCatalogPath],
    ['roleTaskMatrix', roleTaskMatrixPath],
    ['careerEvidence', careerEvidencePath],
    ['imageGenerationCompletions', imageGenerationCompletionsPath],
    ['imageGenerationQueue', imageGenerationQueuePath],
    ['imageRightsPolicy', imageRightsPolicyPath],
  ];
  const canonicalData = await Promise.all(canonicalDataSpecs.map(async ([key, filePath]) => {
    const raw = await readFile(filePath, 'utf8');
    return [key, raw, JSON.parse(raw)];
  }));
  const canonicalDocuments = Object.fromEntries(canonicalData.map(([key, , document]) => [key, document]));
  const canonicalSerialized = Object.fromEntries(canonicalData.map(([key, raw]) => [key, raw]));
  const discovery = buildDatasetDiscoveryArtifacts({
    seed,
    documents: canonicalDocuments,
    serialized: canonicalSerialized,
    assetManifest: canonicalAssetManifest,
  });
  await writeFile(datasetCoveragePath, discovery.serialized.datasetCoverage);
  await writeFile(datasetIndexPath, discovery.serialized.datasetIndex);
  return {
    ...artifacts,
    reviewEvents: lifecycle.reviewEvents,
    recollectionTasks: lifecycle.recollectionTasks,
    evaluationCases: evaluation.evaluationCases,
    trainingCatalog: trainingCareer.trainingCatalog,
    roleTaskMatrix: trainingCareer.roleTaskMatrix,
    careerEvidence: trainingCareer.careerEvidence,
    imageGenerationQueue: imageGeneration.imageGenerationQueue,
    imageRightsPolicy: imageGeneration.imageRightsPolicy,
    imageGenerationCompletions: canonicalCompletionLedger,
    datasetCoverage: discovery.datasetCoverage,
    datasetIndex: discovery.datasetIndex,
    serialized: {
      ...artifacts.serialized,
      ...lifecycle.serialized,
      evaluationCases: evaluation.serialized,
      ...trainingCareer.serialized,
      ...imageGeneration.serialized,
      imageGenerationCompletions: canonicalCompletionLedgerRaw,
      ...discovery.serialized,
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const seedArgument = process.argv.find((argument) => argument.startsWith('--seed='));
  const seed = seedArgument ? seedArgument.slice('--seed='.length) : DEFAULT_SEED;
  if (!seed) throw new Error('seed must not be empty');
  const artifacts = await writeSyntheticArtifacts({ seed });
  console.log(JSON.stringify({
    seed,
    scenarios: artifacts.observations.scenarioCount,
    records: artifacts.observations.recordCount,
    reviewEvents: artifacts.reviewEvents.eventCount,
    recollectionTasks: artifacts.recollectionTasks.taskCount,
    evaluationCases: artifacts.evaluationCases.caseCount,
    trainingModules: artifacts.trainingCatalog.moduleCount,
    roleTaskMappings: artifacts.roleTaskMatrix.mappingCount,
    careerEvidence: artifacts.careerEvidence.evidenceCount,
    imageGenerationQueueItems: artifacts.imageGenerationQueue.itemCount,
    imageGenerationCompletions: artifacts.imageGenerationCompletions.completionCount,
    imageRightsPolicyItems: artifacts.imageRightsPolicy.policyItemCount,
    datasetIndexEntries: artifacts.datasetIndex.artifactCount,
    coverageDimensions: artifacts.datasetCoverage.coverageDimensionCount,
    files: [
      catalogPath,
      observationsPath,
      taxonomyPath,
      reviewEventsPath,
      recollectionTasksPath,
      evaluationCasesPath,
      trainingCatalogPath,
      roleTaskMatrixPath,
      careerEvidencePath,
      imageGenerationCompletionsPath,
      imageGenerationQueuePath,
      imageRightsPolicyPath,
      datasetCoveragePath,
      datasetIndexPath,
    ],
  }, null, 2));
}
