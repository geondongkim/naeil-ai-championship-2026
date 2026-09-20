# NAEIL 역할 × 현장 × 상태 회귀 행렬

검증 기준일: 2026-09-20. 이 문서는 NAEIL 한 제품의 제조·소상공인 두 현장 문맥을 다룬다. 역할 선택은 화면과 동작을 제한하는 UX 필터이며 인증이 아니다. 상태는 해당 브라우저의 `localStorage` 데모 상태일 뿐 영구 저장, 실제 현장 수집, 고용·지급, 승인 학습 데이터 또는 운영 성과를 뜻하지 않는다.

## 증거 표기

- **A — 자동화(현재 로컬):** `npm run check` 또는 명시한 Node 테스트가 확인한 계약.
- **B — 브라우저 관찰(현재 로컬):** 로컬 개발 서버의 실제 Chromium UI에서 관찰한 결과.
- **H — 과거 운영 증거:** 이 배치에서는 새로 확인하지 않았으며 아래 판정 근거로 사용하지 않았다.
- **U — 미검증:** 설계상 기대하지만 이번 배치에서 오류 주입이나 전체 경로 열거로 확인하지 못한 항목.

## 핵심 여정

| ID | 시작 상태 | 역할 | 현장 | 사용자 목표·행동 | 허용/거부 | 기대 상태 전이 | 관찰 가능 합격 기준 |
|---|---|---|---|---|---|---|---|
| MFG-REQ-01 | 초기, gate 0/5 | 요청자 | 제조 | 과제 범위 확인 | 범위 확인만 허용 | 상태 변경 없음 | 요청자는 `scope`만 확인 가능하고 수집·검수 버튼은 없음. **A** |
| MFG-PRO-01 | 초기 | 현장 제공자 | 제조 | 동의·안전·범위 확인 | 세 gate만 허용 | 0/5 → 최대 3/5 | `consent`, `safety`, `scope`만 활성. **A/B** |
| MFG-COL-01 | gate 3/5 | 데이터 오퍼레이터 | 제조 | 합성 입력 선택·기록 | 거부 | 수집 `idle` 유지 | 합성 선택, 파일 선택, 기록 추가가 비활성. **A/B** |
| MFG-COL-02 | gate 5/5 | 데이터 오퍼레이터 | 제조 | 내장 합성 입력 선택 후 기록 추가 | 허용 | `idle` → `collecting`, records 0→1 | 출처는 AI-generated synthetic example, 아직 검수 전. **A/B** |
| MFG-REV-01 | AI complete, submitted | 품질·안전 검수자 | 제조 | 근거 입력 후 승인 | 허용 | review `pending`→`approved`, dataset `draft`→`ready` | 수집자와 다른 역할이며 AI가 아니라 사람이 결정. **A/B** |
| MFG-REV-02 | review pending | 품질·안전 검수자 | 제조 | 보완 사유 입력 후 needs-changes | 허용 | review/collection→`rework`, compensation→false, dataset→기본 draft | 보완 사유 저장 및 재확인 경계. **A** |
| MFG-COO-01 | human approved, dataset ready | 운영 코디네이터 | 제조 | 데모 버전 게시 | 허용 | dataset `ready`→`published` | 사람 승인 뒤 `v1.0-demo`; 실제 저장소 배포가 아님. **A/B** |
| MFG-ACCESS-01 | dataset published | 요청자 | 제조 | 데모 접근 신청 | 허용 | access `notRequested`→`requested` | 요청자에게 게시·승인 control은 없고 실제 인증 권한이 아님. **A/B** |
| MFG-ACCESS-02 | access requested | 운영 코디네이터 | 제조 | 브라우저 접근 기록 승인 | 허용 | access `requested`→`granted` | 마지막 ordered 단계에서만 granted; 브라우저 기록이며 서버 권한이 아님. **A/B** |
| MFG-FDE-01 | 제조, incident none | 현장 적용 전문가 | 제조 | 실패 조건 기록 후 재수집 과제 생성 | 순차 허용 | `none`→`logged`→`recollection` | 설명과 기록된 사고가 있어야 `MF-RECOLLECT-01` 생성, dataset version·제한 범위 연결. **A/B** |
| MFG-CAR-01 | gate 5/5, human approved, browser dataset published | 검수자→운영 코디네이터 | 제조 | 검수된 모의 작업과 교육 확인을 경력 증거에서 추적 | 읽기 허용 | 사람 승인 전 미확인→승인 뒤 품질 확인→게시 뒤 기여 `v1.0-demo` 확인 | 교육·범위·안전·사람 검수·제조 모의 현장 1건·브라우저 게시본이 연결되며 `localStorage 모의 기록`과 비증명 경계가 함께 표시됨. **B** |
| MFG-SIM-01 | 초기, coordinator home | 운영 코디네이터 | 제조 | 로봇·학습·배치·사업·현장 데이터 합성 운영값 탐색 후 실행 시도 | 읽기 허용, 외부 실행 거부 | 제품 workflow·localStorage 상태 변화 없음 | 제조 5개 카드와 75개 세부 항목 표시. 로봇 실행 시도에서 목데이터·미구현 사유·실연동 조건 dialog 표시. **A/B** |
| SMB-REQ-01 | dataset published | 요청자 | 소상공인 | 데모 접근 신청 | 허용 | access→`requested` | 실제 인증 권한이 아닌 브라우저 기록. **A** |
| SMB-PRO-01 | 초기 | 현장 제공자 | 소상공인 | 동의·안전·범위 확인 | 세 gate만 허용 | 0/5 → 최대 3/5 | 현장 제공자 권한 경계를 제조와 동일하게 유지. **A** |
| SMB-COL-01 | gate 5/5 | 데이터 오퍼레이터 | 소상공인 | 합성 입력 기록 후 AI 보조검수 진입 | 허용 | records 증가, AI 실행 전 | 합성 예시·검수 전 라벨 유지. **A/B** |
| SMB-REV-01 | submitted | 품질·안전 검수자 | 소상공인 | 독립 승인 또는 보완 | 허용 | pending→approved 또는 rework | 근거 필수, collector self-review 불가. needs-changes 경로 **A/B** |
| SMB-COO-01 | coordinator, dataset route | 운영 코디네이터 | 소상공인 | canonical 합성 데이터 탐색 | 읽기 허용 | 제품 workflow 상태 변경 없음 | 전체 120/12/8/28, 현재 필드 60건, 첫 페이지 12건, same-origin 다운로드. **B** |
| SMB-FDE-01 | manufacturing에서 fde 선택 | 현장 적용 전문가 | 소상공인으로 전환 | 제조 전용 역할로 소상공인 진입 시도 | 거부·회복 | role→`coordinator`, role 시작 화면으로 이동 | FDE 선택지·incident 탐색 비노출, 안내 toast; direct `#incident`도 action 0개. **A/B** |
| SMB-CAR-01 | gate 5/5, human approved, dataset draft | 품질·안전 검수자 | 소상공인 | 완료 교육과 독립 검수된 모의 작업의 경력 증거 확인 | 읽기 허용 | 교육·품질·모의 현장 확인, 추적 가능한 기여는 미확인 유지 | 소상공인 모의 현장 1건과 사람 검수 기록은 표시되지만 게시 전 기여는 확인되지 않으며 성과·자격·지급 증명이 아님. **B** |
| SMB-SIM-01 | 초기, coordinator home | 운영 코디네이터 | 소상공인 | 보조기기·학습·채용·상권·파트너 데이터 합성 운영값 탐색 후 실행 시도 | 읽기 허용, 외부 실행 거부 | field/role 외 workflow 상태 변화 없음 | 소상공인 5개 카드와 75개 세부 항목 표시. 채용·자격 확정 시도에서 상세 경계 dialog, `scrollWidth=390`, console 0. **A/B** |

## 부정·오류·회복 시나리오

| ID | 시작 상태 | 역할·현장 | 행동/오류 | 허용/거부 | 기대 전이·표시 | 합격 기준과 현재 증거 |
|---|---|---|---|---|---|---|
| NEG-MFG-ROLE-01 | 초기 | 요청자·제조 | `#collect` 직접 링크 | 읽기만 허용, 작업 거부 | 상태 변화 없음 | 수집·파일·제출 동작 0개, 거부 notice, 1440px에서 overflow 없음. **B** |
| NEG-SMB-ROLE-01 | 초기 | collector·소상공인 | `#review` 직접 링크 | 검수 거부 | 상태 변화 없음 | 승인/보완 동작 0개, self-review 거부 notice, 390px에서 overflow 없음. **B** |
| NEG-GATE-01 | gate 0–4/5 | collector·양쪽 | 입력 선택·기록 추가 | 거부 | 수집 상태 유지 | 버튼 비활성 + 클릭 처리에서도 `allGates()` 재검사. **A/B(3/5)** |
| NEG-SELF-REVIEW-01 | submitted | collector·양쪽 | 승인/보완 시도 | 거부 | review 유지 | 결정 버튼 비노출, 이벤트 처리도 reviewer 역할 재검사. **A/B** |
| ERR-AI-503-01 | records 1 | collector·제조 | 키 없는 로컬 API에서 분석 | 거부·회복 가능 | AI→`error`, review 제출 비활성 | 실패·제출 차단 표시. HTTP 503 한 건은 예상 console error이며 그 외 warning/error 없음. **A/B** |
| ERR-AI-429-01 | records 1 | collector·양쪽 | API rate limit | 거부·재시도 가능 | AI→`error` | POST 429 JSON 뒤 성공 신호 없음, review `waiting`, dataset `draft`, 제출 disabled. **A/B(제조)** |
| ERR-AI-MALFORMED-01 | records 1 | collector·양쪽 | 필수 필드가 빠진 200 JSON 응답 | 거부 | AI→`error` | “응답 형식이 올바르지 않음”, review `waiting`, dataset `draft`, 제출 disabled. **A/B(제조)** |
| ERR-AI-INCOMPLETE-01 | records 1 | collector·양쪽 | 필수 분석 필드 또는 human 권한 누락 | 거부 | AI→`error` | `validatedAnalysis`가 fail-closed. **A** |
| REC-NEEDS-CHANGES-01 | review pending | reviewer→collector·양쪽 | 사람 보완 요청 후 재수집 | 허용 | rework, compensation false, dataset draft | 보완 이유 저장, collector 복귀 시 4/5와 compensation 재확인 필요, 자동 승인 없음. **A/B(소상공인)** |
| ERR-DATA-LOAD-01 | dataset explorer idle | coordinator·제조 | coverage JSON HTTP 503 | 읽기 실패, protected action 없음 | explicit error + retry | canonical metric 0개, retry 노출, 승인·게시·접근 승인 control 0개. **A/B** |
| ERR-DATA-PARSE-01 | dataset explorer idle | coordinator·소상공인 | coverage JSON 200 + malformed body | 읽기 실패, protected action 없음 | explicit parse error + retry | 390×844에서 canonical metric 0개, protected control 0개, overflow·console 오류 없음. **A/B** |
| REC-DATA-RETRY-01 | HTTP 오류 표시 | coordinator·제조 | retry 후 원본 same-origin bytes 수신 | 읽기 복구 | explorer `error`→`ready` | 120/12/8/28, 제조 60건, 1/5 페이지·12행, 다운로드 3개, protected control 0개. **A/B** |
| EMPTY-DATA-01 | explorer ready | dataset nav 역할·양쪽 | 일치하지 않는 scenario+issue 조합 | 읽기 허용 | 빈 결과 | “합성 관찰값이 없음”과 미승인 경계 표시. 필터 함수 **A**, canonical 12×8 완전 교차로 실제 UI 빈 조합 관찰은 **U** |
| MOBILE-OVERFLOW-01 | dataset ready | coordinator·소상공인 | 390×844에서 dataset 표 확인 | 허용 | 상태 변경 없음 | `scrollWidth=390`, 12행 제한, console 0. **B** |
| NEG-UNKNOWN-HASH-01 | 임의 hash | 모든 역할·양쪽 | 알려지지 않은 deep link | 안전한 역할 시작 화면 | hash가 protected capability를 만들지 않음 | renderer 미등록 hash는 `starts[role]`로 렌더링. **A** |
| NEG-CAREER-ROLE-01 | 다른 역할이 만든 browser-demo evidence 존재 | 요청자·제조 / 현장 제공자·소상공인 | nav에 없는 `#career` 직접 링크 | 공개 읽기만 허용, 완료 주장·변경 거부 | workflow 상태 변화 없음 | 역할 nav에 경력 메뉴가 없고 direct link에도 승인·보완·게시·접근 승인 control 0개; `localStorage 모의 기록`과 공인 교육·자격·채용·고용·임금·지급 비증명 안내가 유지됨. **B** |

## 브라우저 재현 증거

로컬 빌드를 `npm run dev`로 제공한 `http://127.0.0.1:4173`에서 실제 Chromium으로 확인하였다. 각 새 브라우저 세션은 빈 `localStorage`에서 시작했으며 네트워크·콘솔 관찰과 viewport 측정을 분리했다.

1. **제조 desktop, 1440×900:** requester가 `#collect`를 직접 열었을 때 protected action 0, 거부 notice, `scrollWidth=1440`, console error/warning 0. provider가 3개 gate를 확인한 뒤 collector 입력 버튼은 3/5에서 비활성, 5/5에서 합성 기록 1건 추가가 가능했다. 키 없는 로컬 `POST /api/analyze`는 503이었고 UI는 `AI error`, `review waiting`, dataset `draft`, 제출 비활성으로 유지했다. 이 호출의 예상 failed-resource console error 1개 외 warning은 0이었다.
2. **소상공인 mobile, 390×844:** coordinator의 `#dataset`에서 `scrollWidth=390`, console error/warning 0. canonical 값 120 observations, 12 scenarios, 8 complete-provenance images, 28 planned slots을 읽었고 현재 필드 60건, 첫 페이지 12행, `./data/…` 다운로드 3개를 표시했다.
3. **소상공인 negative-role mobile, 390×844:** collector가 `#review`를 직접 열었을 때 승인/보완 control 0, self-review 거부 notice, `scrollWidth=390`, console error/warning 0.
4. **AI 429 JSON, 제조 desktop 1440×900:** Playwright가 same-origin `POST /api/analyze`를 429 JSON으로 응답했다. network에는 POST 429가 기록되었고 UI는 `분석 실패`/`제출 차단`, submit disabled, approval/publish control 0을 표시했다. 저장 상태는 collection `collecting` 1건, AI `error`, review `waiting`, dataset `draft`; console은 의도한 429 failed-resource 1건, warning 0이었다.
5. **AI incomplete 200 JSON, 같은 제조 세션:** route를 필수 분석 필드가 빠진 `model + decisionAuthority=human + summary` 응답으로 교체했다. network에는 POST 200이 기록되었지만 `validatedAnalysis`가 거부하여 AI `error`, review `waiting`, dataset `draft`, submit disabled, approval/publish control 0을 유지했다. 이전 429 console 항목 외 새 error/warning은 없었다.
6. **Dataset HTTP 오류와 retry, 제조 desktop 1280×800:** 첫 `dataset-coverage.json`만 503, 나머지 두 canonical JSON은 200이었다. 오류 화면은 metric 0개, retry 1개, protected control 0개였고 Live API·생성 완료·승인 데이터가 아님을 명시했다. retry에서는 세 JSON 모두 200으로 다시 요청되어 120/12/8/28, 제조 60건, 1/5 페이지·12행, same-origin 다운로드 3개로 복구했다. `scrollWidth=1280`; console은 의도한 503 failed-resource 1건, warning 0이었다.
7. **Dataset malformed JSON, 소상공인 mobile 390×844:** coverage 요청은 HTTP 200이지만 body를 깨진 JSON으로 가로챘다. UI는 JSON 형식 오류, metric 0개, retry 1개, protected control 0개를 보였고 `scrollWidth=390`, console error/warning 0이었다.
8. **Valid AI → human approval → controlled-use 기록, 제조 desktop 1440×900:** provider가 consent/safety/scope, collector가 training/compensation을 UI에서 확인해 5/5가 된 뒤 내장 합성 예시 1건을 기록했다. Playwright가 POST에 `model=deterministic-local-stub-v1`, `decisionAuthority=human`, `recommendation=ready_for_human_review`인 완전한 200 JSON을 반환했고 collector 화면에는 검수 결정 control이 0개였다. collector 제출 뒤 reviewer 시작 화면 `#review`에서 사람 근거를 입력해 승인하여 dataset이 `ready`가 되었고, coordinator만 `published/v1.0-demo`, requester만 access `requested`, coordinator만 최종 `granted`로 순서대로 바꿨다. 최종 상태는 collection `submitted`, AI `complete`, review `approved`, dataset `published`, access `granted`; 출처는 AI-generated synthetic example, 권리는 실제 현장/청년 수행/학습 승인 데이터가 아닌 제품 흐름 시연용이었다. 각 역할 전환마다 start route와 nav가 바뀌었고 모든 측정에서 `scrollWidth=innerWidth`; network POST 200과 canonical JSON 200, console error/warning 0이었다.
9. **Valid AI → independent needs-changes, 소상공인 mobile 390×844:** field 전환 뒤 provider 3개·collector 2개 gate를 확인해 5/5, 합성 예시 1건, 같은 deterministic POST 200 AI signal, collector 제출 순으로 진행했다. collector가 `#review`를 직접 열었을 때 decision control 0개와 self-review 거부 안내를 확인했고, reviewer 시작 화면에서 사람이 “포장 경계가 가려져 … 다시 기록” 사유를 입력해 보완 요청했다. 결과는 collection/review `rework`, dataset `draft`, access `notRequested`, compensation false였으며 collector 복귀 후 task는 4/5이고 compensation만 unchecked·활성 상태였다. 게시·접근 승인 control은 0개, 모든 측정에서 `scrollWidth=innerWidth`; network POST 200, console error/warning 0이었다.
10. **Manufacturing incident → scoped recollection 및 small-business 차단:** 빈 `localStorage`의 제조 desktop 1440×900에서 FDE 선택 시 start route는 `#incident`, nav는 사고·재수집/버전·출처/현장 경험이었다. 초기 state는 `none`, create button disabled였고 빈 description의 log는 “관찰된 실패 조건을 입력” 안내와 함께 `none`을 유지했다. 테스트용으로 disabled를 해제해 create handler를 직접 호출해도 “기록된 사고 조건이 필요” 안내와 함께 skip이 차단되었다. “합성 반사면 예시에서 측면 조명 변화 후 경계 판독 불안정”을 기록한 뒤에만 `logged`, create enabled가 되었고 기준 `v0.1-draft`, 재수집 ID 생성 전, 새 범위 미정이 보였다. 다음 click에서만 `recollection`, `MF-RECOLLECT-01`, “변경 조명 조건의 반사면 샘플만”으로 바뀌었으며 화면은 모델·장비를 제어하지 않고 브라우저 계보만 기록한다고 명시하고 실제 배정·로봇 제어 문구는 없었다. 이어서 mobile 390×844로 resize하고 소상공인으로 전환하자 role은 coordinator로 fallback, FDE option·incident nav·incident action이 사라졌고, direct `#incident`도 제조 전환 안내와 action 0개만 표시했다. 제조 recollection state와 소상공인 `none` state는 분리되었고 양 viewport에서 `scrollWidth=innerWidth`, console error/warning 0이었다.
11. **Reviewed work → career evidence, 제조 desktop 1440×900:** 빈 상태에서 provider의 consent/safety/scope와 collector의 training/compensation을 실제 control로 확인해 5/5를 만들고, AI-generated synthetic example 1건을 기록했다. Playwright가 same-origin POST에 `model=deterministic-career-stub-v1`, `decisionAuthority=human`, `recommendation=ready_for_human_review`인 완전한 200 JSON을 반환했으며 collector에게 승인·보완 control은 없었다. 독립 reviewer가 이유를 남겨 승인한 직후 reviewer의 `검수 증거`에는 교육·허용 범위·안전·사람 승인·`제조 모의 현장 · 1개 기록`이 확인되고 게시 전 `추적 가능한 기여`는 미확인으로 남았다. coordinator만 브라우저 데모 버전을 게시한 뒤 `직무 증거`의 마지막 항목이 `v1.0-demo`로 바뀌었다. 화면에는 `localStorage 모의 기록` badge와 공인 교육·자격증·채용·고용 성과·임금·실제 지급을 증명하지 않는다는 안내가 함께 있었고, 실제 수집·파트너 데이터·영구 기록 문구는 없었다. role switch마다 requester `#task`, reviewer `#review`, coordinator `#home` 시작 화면과 역할별 nav가 적용되었고, `scrollWidth=innerWidth=1440`, POST 200, console error/warning 0이었다.
12. **Reviewed work → career evidence 및 negative role, 소상공인 mobile 390×844:** 별도 빈 상태에서 provider 3개·collector 2개 gate를 확인하고 소상공인 합성 예시 1건, 같은 deterministic AI 200 신호, collector 제출, independent reviewer의 사유 있는 승인을 순서대로 수행했다. reviewer의 `검수 증거`에는 교육·범위·안전·사람 승인·`소상공인 모의 현장 · 1개 기록`이 확인되었지만 dataset을 게시하지 않아 `추적 가능한 기여`는 미확인으로 유지되었다. 현장 제공자로 전환하면 시작 화면은 `#task`, nav는 역할 홈/현장 조건/권리 조건으로 복귀하고 경력 메뉴가 없었다. direct `#career`는 읽기 화면만 열었으며 protected control 0개, `localStorage 모의 기록` 및 비증명 안내를 유지해 제공자가 새 완료·승인·게시 상태를 만들 수 없었다. 모든 단계에서 `scrollWidth=innerWidth=390`, POST 200, console error/warning 0이었다.
13. **Expansion simulation attempt boundary:** 제조 desktop 1440×900 운영 코디네이터 홈에서 로봇·학습·배치·사업·현장 데이터 5개 합성 카드를 확인했다. `로봇 제어 실행`을 선택한 뒤에만 실물 로봇·제어기·안전 PLC·실행 권한 미연결 사유와 실제 연결 조건 dialog가 열렸고, 클릭 전후 `localStorage`는 비어 있어 제품 상태 변화가 없었다. 이어 소상공인 mobile 390×844에서 별도 5개 카드와 `채용·자격 확정` dialog를 확인했으며 `scrollWidth=390`, console error/warning 0이었다. 데이터 오퍼레이터로 전환하면 시뮬레이션 섹션은 사라지고 역할 시작 화면 `#collect`로 이동했다.

재현 도구: `playwright_cli.sh --session <name> open http://127.0.0.1:4173`, viewport resize, role/field select, hash 이동, DOM 상태·`document.documentElement.scrollWidth` 평가, `requests`, `console warning` 확인. 이 증거는 로컬 브라우저 동작만 말하며 인증이나 영구 저장을 검증하지 않는다.

## 남은 위험과 다음 우선순위

- **가장 큰 남은 clean-room 위험:** 이번 실패 주입은 재현 가능한 실제 Chromium 관찰이지만 CI에서 자동 실행되는 브라우저 suite는 아니다. 정적 계약 테스트와 Node API 테스트가 경계를 보호하더라도 DOM 이벤트·라우팅·request interception을 합친 회귀는 다음 실행 전까지 수동 증거다.
- clean-room `AGENTS.md`와 `PRODUCT_BRIEF.md`에는 41개 route 요구가 없다. 따라서 다른 저장소의 legacy 41-page parity를 이 저장소의 미달 요건으로 취급하지 않는다. 현재 clean-room route는 등록된 role navigation과 renderer fallback 계약으로만 평가한다.
- 429·불완전 200 AI 응답과 dataset HTTP/parse 오류는 실제 브라우저에서 fail-closed로 확인했고, 별도 빈 세션의 valid AI signal 뒤 사람 승인·게시·접근 흐름과 사람 보완·gate reset 흐름도 확인했다.
- reviewed work·training→career evidence는 제조 desktop과 소상공인 mobile에서 실제 Chromium으로 확인했다. 게시 전 기여 미확인과 게시 뒤 `v1.0-demo` 전이가 분리되며, 권한 없는 역할은 direct link에서도 읽기만 가능했다.
- **다음 큰 in-scope 시나리오 위험:** 핵심 제품 brief 여정은 브라우저 관찰을 마쳤지만 이 증거는 여전히 수동 Playwright 세션이다. role×field×state 전환과 경력 증거의 비증명 문구를 실제 브라우저에서 반복 실행하는 CI suite가 없어 DOM·라우팅 회귀를 자동 차단하지 못한다.
- 완전 교차 canonical 데이터는 현재 필터 조합에서 자연스러운 빈 결과를 만들기 어려워 helper 수준으로만 확인했다.
- 확장 운영 시뮬레이션은 외부 실행을 의도적으로 막는 목데이터 UX이며 실제 장비·학습·채용·계약·파트너 데이터 연결 증거가 아니다. 실제 연결 전에는 해당 실행 버튼이 제품 상태를 변경해서는 안 된다.
