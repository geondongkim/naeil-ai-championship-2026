# Wanted AI Championship 2026 제출 초안

상태: 개인 출품을 위한 작성 초안이며 제출 폼에는 등록하지 않았습니다.

공개 서비스: [https://naeil-ai-championship-2026.vercel.app/](https://naeil-ai-championship-2026.vercel.app/)

## 과제명

NAEIL — 제조·소상공인 현장 데이터와 청년 Physical AI 직무를 잇는 운영 제품

## 문제 정의

Physical AI는 작업 환경과 실패 맥락이 담긴 현장 데이터가 필요하지만, 작은 제조 현장과 소상공인 현장에는 동의, 안전, 수집 범위, 품질, 권리, 재작업을 함께 관리하는 운영 체계가 부족합니다. 동시에 자동화로 초급 업무가 바뀌는 동안 현장 맥락 수집, 품질 검수, 권리 관리, 적용 검증, 재수집 같은 역할은 정식 경력 증거로 남기 어렵습니다.

## 제안

NAEIL은 제조와 소상공인을 한 제품 안의 두 현장으로 연결합니다. 역할과 현장 선택에 따라 시작 화면, 메뉴, 허용 행동, 표현이 달라지는 운영 모델을 제안하며, 다음 생애주기를 하나의 추적 가능한 흐름으로 설계합니다.

`요청 -> 동의·범위 -> 교육·배정 -> 수집 -> AI 보조 신호 -> 독립 사람 검수 -> 권리 기반 버전 -> 제한된 이용 -> 사고·재수집`

수집 전에는 현장 동의, 교육, 안전, 작업 범위, 보상조건 확인이 모두 필요합니다. 수집자는 자신의 결과를 승인할 수 없고, AI는 승인자가 아니라 사람 검수를 돕는 신호입니다.

## 제안 직무 경로

- 현장 데이터 코디네이터: 범위·일정·동의·제한구역 조율
- Physical AI 데이터 오퍼레이터: 승인된 절차에 따른 현장 데이터 수집
- 데이터 품질·안전 검수자: 품질·개인정보·안전·재작업 독립 판단
- 데이터 권리 관리자: 목적·보존기간·재사용·철회 조건 관리
- 현장 적용 전문가: 통제된 조건에서 모델·장비 적용과 사고 연결
- 재수집 운영자: 실패·변화·드리프트를 새 수집 과제로 전환

이 여섯 경로는 제안 직무이며 이미 만든 일자리, 채용, 배치 성과를 뜻하지 않습니다.

## 현재 구현된 결과

### 반응형 역할 기반 UI

하나의 반응형 브라우저 UI에서 제조와 소상공인 현장을 전환할 수 있습니다. 역할을 바꾸면 시작 화면, 사이드바 메뉴, 허용 행동, 안내 문구가 함께 바뀌며, 소상공인 현장에서는 제조 중심 현장 적용 전문가 역할과 사고 모듈을 노출하지 않습니다. 데스크톱은 고정 사이드바, 모바일은 메뉴 버튼·드로어·스크림과 단일 열 카드·테이블 레이아웃을 사용합니다.

역할 선택은 인증이 아니라 UX 필터입니다. 데모 상태는 제조와 소상공인별 `localStorage`에 분리되며 실제 사용자 계정이나 영구 서버 데이터가 아닙니다.

### 확장 운영 시뮬레이션

운영 코디네이터와 제조 현장 적용 전문가는 로봇·보조기기 제어, 모델 학습, 청년 배치·채용·자격, 고객·매출·파트너십, 실제 현장·파트너 데이터 연결을 가정한 합성 운영 카드를 탐색할 수 있습니다. 제조·소상공인별 5개 카드에는 가상 명령, 합성 프로필, 학습 후보, 가상 파이프라인, canonical 합성 관찰값 등 서로 다른 수치와 준비 항목이 표시됩니다. 각 카드에는 `AI-generated synthetic example` 출처를 유지합니다.

각 영역은 5개 세그먼트와 세그먼트별 3개 필드로 구성되어 필드별 75개, 총 150개 합성 운영값을 제공합니다. 카드에서는 대표 행만 보여주고 `상세 목데이터 15개 보기`에서 전체 표를 확인할 수 있습니다. 모든 값은 제품 흐름 검증용이며 실제 장비 명령, 학습 실행, 고용·자격 확정, 계약·매출 또는 파트너 현장 데이터를 뜻하지 않습니다.

평상시 화면은 운영 가설과 목데이터를 먼저 보여 줍니다. 사용자가 제어·학습·배치·계약·동기화 실행을 선택할 때에만 대화상자가 열려 현재 미구현 사유, 실제 연결에 필요한 안전·권리·계약·검증 조건, 외부 시스템을 호출하지 않고 제품 상태도 변경하지 않는다는 경계를 설명합니다.

### 운영 상태 전이

- 역할별 담당자가 현장 동의, 교육, 안전, 작업 범위, 보상조건 확인의 다섯 gate를 나누어 확인합니다.
- 데이터 오퍼레이터는 다섯 gate가 모두 확인된 뒤에만 합성 예시 또는 브라우저 임시 파일의 수집 기록을 추가할 수 있습니다.
- 데이터 오퍼레이터가 UI에서 `AI 보조 분석 실행`을 선택하면 브라우저가 해당 이미지를 same-origin `POST /api/analyze`로 전송합니다. 사람 최종판단 경계가 확인된 성공 응답만 보조 신호로 저장되며, 수집자는 이를 확인한 뒤 독립 검수 대기열로 제출합니다.
- 독립 검수자는 결정 이유를 입력해 보완 또는 사람 승인을 기록합니다. 보완 시 보상조건 gate를 다시 확인해야 하며, 수집자는 자기 결과를 승인할 수 없습니다.
- 사람 승인 뒤 운영 코디네이터가 권리 표시 브라우저 데이터셋 버전을 게시하고, 요청자 접근 신청과 운영 승인 기록을 별도 상태로 남깁니다.
- 교육, 허용 작업, 안전, 독립 검수, 현장 경험, 버전 기여를 제안 직무의 데모 경력 증거로 표시합니다.
- 제조 현장 적용 전문가 또는 운영 코디네이터는 사고 조건을 데이터셋 버전과 연결하고 범위가 정해진 재수집 과제를 생성할 수 있습니다.

### 결정적 합성 데이터와 읽기 전용 탐색기

현재 로컬 canonical 데이터는 제조 6개·소상공인 6개의 12개 시나리오를 기준으로 구성됩니다. AI 생성 합성 observation 120건, 품질 taxonomy 8개 코드, AI 보조 신호와 독립 사람 검수를 분리한 lifecycle review event 240건, deterministic 재수집 계획 96건을 포함합니다. 또한 제안 직무 학습 모듈 18개, 6개 직무와 12개 시나리오를 잇는 role-task mapping 72건, 실제 사람이 아닌 합성 profile의 demonstration-only 경력 증거 120건, 정확도·성능 측정이 아닌 metadata-only 합성 evaluation case 96건을 제공합니다.

데이터셋 화면은 `dataset-coverage.json`, `synthetic-observations.json`, `image-generation-queue.json`을 same-origin 정적 경로에서만 읽습니다. 현장 전환에 따라 제조 또는 소상공인 범위로 제한하고, 시나리오와 품질 issue 필터를 함께 적용하며, 관찰값을 최대 12건씩 페이지로 나눠 표시합니다. 세 canonical JSON은 일반 다운로드 링크로만 제공하며 백엔드 export, 영구 저장 또는 Live API로 설명하지 않습니다. 로딩·요청/해석 실패·빈 결과 상태 역시 실제 수집 완료나 승인 데이터처럼 보이지 않도록 구분합니다.

이미지 계보에는 완전한 prompt/output/file provenance와 사람이 확인한 prototype-only 경계를 갖춘 생성 이미지 8개가 있습니다. 별도로 이전 partial-provenance 자산 3개를 그대로 구분해 보존하며, queue의 나머지 28개 슬롯은 `planned-not-generated`여서 파일이나 생성 완료 자산으로 간주하지 않습니다.

### AI 서버 함수

`POST /api/analyze`는 같은 출처의 `application/json` 요청만 허용하고, 크기 제한 안의 JPEG·PNG·WebP data URL과 작업 맥락을 검사합니다. 서버 실행 환경에 `OPENAI_API_KEY`가 있을 때만 OpenAI Responses API를 호출하며, 엄격한 JSON 스키마로 작업 적합성·조명·구도·흐림·개인정보 위험·재수집 지침을 반환합니다. 키가 없으면 외부 호출 없이 503을 반환하고, 성공 응답도 최종 결정 주체를 사람으로 표시합니다.

브라우저 UI는 이 서버 함수에 연결되어 있습니다. 키가 없는 환경에서는 503 응답을 오류로 표시하고 성공 신호를 저장하지 않으며 독립 검수 제출도 비활성 상태로 유지하는 흐름을 확인했고, 별도의 API 테스트는 mocked upstream을 사용해 strict 응답 스키마와 `decisionAuthority: human` 계약을 검증합니다.

승인된 로컬 서버 키와 `manufacturing-inspection-synthetic.png`를 사용한 실모델 호출에서는 HTTP 200과 모델 `gpt-5-mini-2025-08-07`을 확인했습니다. 해당 한 건의 구조화 응답은 `decisionAuthority=human`, `recommendation=ready_for_human_review`, `task_match/lighting/framing/blur=good`, `privacy_risk=possible`이었습니다.

마지막으로 확인한 production alias에서도 합성 이미지 한 건의 `POST /api/analyze`가 HTTP 200을 반환했고, `model=gpt-5-mini-2025-08-07`, `decisionAuthority=human`, `recommendation=ready_for_human_review`, `Cache-Control: no-store`를 확인했습니다. 이 결과는 당시 로컬 및 production 연결과 사람 최종판단 계약에 대한 단일 합성 예시 실행 증거이며, 최신 로컬 데이터·탐색기의 배포 여부, 성능·정확도나 실제 사용자·고용 성과의 측정 결과가 아닙니다.

### 제출 대표 화면

다음 5개 1440×810 PNG는 현재 구현을 기록한 제출용 화면입니다.

1. [제조 홈](../assets/submission/wanted-ai-championship-2026/01-manufacturing-home.png)
2. [실제 AI 보조검수](../assets/submission/wanted-ai-championship-2026/02-live-ai-review.png)
3. [독립 사람 검수](../assets/submission/wanted-ai-championship-2026/03-independent-human-review.png)
4. [소상공인 홈](../assets/submission/wanted-ai-championship-2026/04-small-business-home.png)
5. [청년 경력 증거](../assets/submission/wanted-ai-championship-2026/05-youth-career-evidence.png)

### 현재 로컬 검증과 마지막 production snapshot

현재 로컬의 `npm run build`는 명시적 공개 허용목록 32개 파일을 `dist`에 복사하고 파일별 SHA-256 보고서를 만듭니다. 여기에는 canonical JSON과 자산 매니페스트에 등록된 완전 provenance 이미지 8개 및 이전 partial-provenance 이미지 3개가 포함됩니다. `npm run check`는 이 빌드 뒤 Node 테스트 94/94를 통과했으며 문서·테스트·스크립트·환경파일이 배포 산출물에 섞이지 않는지, canonical 참조·해시·결정성, 탐색기 경로·필터·페이지·다운로드 경계와 확장 운영 시뮬레이션의 상태 비변경 계약을 확인합니다. `npm run deploy:prepare`는 전체 검증 뒤 공개 파일, `api/analyze.mjs`, 최소 `package.json`, `vercel.json`만 임시 배포 소스에 모으며 그 명령 자체는 배포하지 않습니다.

마지막으로 기록된 이전 production snapshot은 당시 준비 결과의 14개 허용목록 파일을 Vercel에 배포한 상태입니다. 그 시점의 alias에서 `/`, `/app.mjs`, `/assets/synthetic-workcell.svg`는 모두 HTTP 200이었고, `GET /api/analyze`는 의도한 HTTP 405와 `Allow: POST`, `Cache-Control: no-store`를 반환했습니다. Chromium 검증은 1440×810 제조·운영 코디네이터와 390×844 소상공인·데이터 오퍼레이터에서 진행했으며, 두 경로 모두 `scrollWidth=innerWidth`, `workcellLoaded=true`, 콘솔 오류·경고 0건이었습니다. 이 역사적 14-file snapshot과 현재 로컬 32-file 빌드는 별개이며, 현재 production 반영 상태는 배포 뒤 공개 alias에서 독립적으로 확인해야 합니다.

### 구현하지 않은 범위

실제 운영 인증과 강제 가능한 서버 권한, 영구 저장, 실제 결제·지급, 로봇 제어, 모델 학습은 구현하지 않았습니다. 검증된 사용자·고객·파트너십·매출·고용 성과·모델 성능 개선도 주장하지 않습니다.

## 데이터 출처 경계

| 항목 | 표시 상태 | 현재 의미 |
|---|---|---|
| 제조·소상공인 canonical 메타데이터 | AI-generated synthetic example | 12개 시나리오와 120개 observation 및 연결된 review·재수집·직무·평가 기록이며 실제 현장 수집물·청년 작업·승인 학습 데이터가 아님 |
| 생성 완료 이미지 | AI-generated synthetic example | 완전 provenance prototype 8개와 이전 partial-provenance 자산 3개이며 실제 현장·파트너 자료가 아님 |
| 이미지 생성 계획 | AI-generated synthetic example | 28개 `planned-not-generated` 슬롯으로, 생성 완료 파일이나 승인 학습 데이터가 아님 |
| KAMP AI | External catalog link | 공식 카탈로그 후보이며 데이터/API 미연결 |
| AI Hub | External catalog link | 공식 카탈로그 후보이며 다운로드·API 미연결 |
| data.go.kr | External catalog link | 공식 카탈로그 후보이며 서비스키/API 미사용 |

외부 후보는 모두 `Live API`가 아닙니다. 데이터별 이용조건을 검토하고 실제 배포 호출을 검증하기 전에는 연동 완료로 표현하지 않습니다.

## 이미지와 권리

현재 공개 자산 매니페스트에는 클린룸 합성 이미지 11개가 있습니다. 그중 새로 생성한 8개는 exact prompt와 그 해시, OpenAI built-in imagegen 세션·output ID, 파일 SHA-256·byte length·dimensions, 사람의 prototype 용도 검수, 프로젝트 사용 권한을 completion ledger와 함께 기록한 complete provenance 자산입니다. 이전의 제조 검사·제과점 진열·카페 컵 정리 자산 3개는 exact prompt 전체가 보관되지 않은 partial provenance로 정직하게 구분합니다. queue의 다른 28개 슬롯은 계획일 뿐 생성 완료로 표시하지 않으며, 어떤 합성 이미지도 실제 현장·청년 수행·파트너 제공·학습 승인 자료처럼 설명하지 않습니다.

루트 MIT 라이선스는 이 저장소에서 새로 작성한 소프트웨어 코드와 테스트에만 적용됩니다. 문서, 데이터, 프롬프트, 래스터 이미지와 기타 미디어는 자동으로 MIT 범위에 포함되지 않으며, 자산 매니페스트의 개별 허가가 우선합니다.

## 클린룸 작성 선언

이 제출 초안과 함께 제공되는 README, JSON 카탈로그, 출처 규격, 검증 테스트는 이 저장소를 위해 새로 작성했습니다. 다른 저장소의 코드, 화면, 스크린샷, 문구, 데이터, 미디어를 복사하지 않았습니다. 이 선언은 새 파일의 작성 근거만 설명하며, 다른 저장소의 관련 없는 이력이나 타인의 기여를 지우거나 대체하지 않습니다.

## 재현 검증

```sh
npm run check
```

현재 로컬 확인 결과는 32개 허용목록 빌드 파일과 Node 테스트 90/90 통과입니다. 이 수치는 마지막 production snapshot의 14개 파일과 구분되며, 공개 서비스의 현재 상태는 배포 뒤 별도로 확인해야 합니다.

최종 제출 전에는 공개 URL의 현재 상태, 자산별 권리, 비밀정보·개인정보 부재, 제출 폼의 공개 범위를 사람이 다시 확인해야 합니다.
