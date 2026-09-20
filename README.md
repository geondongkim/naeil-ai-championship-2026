# NAEIL

**New AI Employment & Industry Link**

현장의 AI와 청년의 내일을 잇다

NAEIL은 제조와 소상공인을 별도 서비스로 나누지 않고, 하나의 현장 데이터 운영 제품 안에서 전환하는 두 현장으로 다룹니다. 목표 흐름은 요청, 현장 동의와 준비, 수집, AI 보조 품질 신호, 독립적인 사람 검수, 권리 기반 데이터셋 버전, 경력 증거, 사고 기반 재수집을 연결하는 것입니다.

## 현재 구현

저장소에는 반응형 단일 페이지 UI, 서버 함수, 결정적 데이터 카탈로그, 합성 이미지 3개, 명시적 공개 파일 빌드와 production 배포 검증이 구현되어 있습니다. 공개 서비스는 [https://naeil-ai-championship-2026.vercel.app/](https://naeil-ai-championship-2026.vercel.app/)에서 확인할 수 있습니다.

- 데스크톱 사이드바와 모바일 드로어를 사용하는 반응형 UI
- 제조 ↔ 소상공인 현장 전환과 역할별 시작 화면·탐색·행동·문구
- 요청자, 현장 제공자, 데이터 오퍼레이터, 독립 검수자, 운영 코디네이터, 제조 중심 현장 적용 전문가 역할
- 현장 동의, 교육, 안전, 작업 범위, 보상조건 확인의 다섯 gate
- 수집 기록 → AI 보조 신호 → 독립 사람 검수 → 권리 표시 데이터셋 버전 → 경력 증거 → 제조 사고·재수집 상태 전이
- `POST /api/analyze` 이미지 품질 분석 서버 함수
- 공개 허용목록과 SHA-256 보고서를 사용하는 정적 빌드 및 14개 허용목록 파일의 Vercel production 배포

역할 선택은 브라우저 UX 필터이며 인증이나 서버 권한이 아닙니다. 화면 상태는 현장별로 `localStorage`에 분리해 보관하는 데모 기록이고, 영구 서버 저장이나 실제 지급 기록이 아닙니다.

### AI 보조검수 경계

브라우저의 `AI 보조 분석 실행`은 선택한 이미지 또는 내장 합성 예시를 메모리에서 data URL로 변환해 same-origin `POST /api/analyze`에 전송합니다. 서버 함수는 크기 제한 안의 JPEG·PNG·WebP와 작업 맥락을 검증하고, 서버 실행 환경에 `OPENAI_API_KEY`가 설정된 경우에만 OpenAI Responses API를 호출합니다. 키가 없으면 유료 호출 없이 503을 반환하며 브라우저는 준비되지 않았다는 오류를 표시하고 독립 검수 제출을 비활성 상태로 유지합니다. 성공 응답도 승인·공개·보상 권한을 갖지 않고 `decisionAuthority: human`이어야만 보조 신호로 저장됩니다.

검증 범위는 층별로 구분합니다. 키가 없는 환경에서는 브라우저가 503을 처리하는 실패 경로를 확인했고, 자동 테스트에서는 mocked upstream으로 엄격한 응답 스키마와 사람 최종판단 경계를 확인했습니다. 별도로 승인된 로컬 서버 키와 `manufacturing-inspection-synthetic.png`를 사용한 실제 호출은 HTTP 200을 받았고, 응답 모델은 `gpt-5-mini-2025-08-07`, `decisionAuthority=human`, `recommendation=ready_for_human_review`, `task_match/lighting/framing/blur=good`, `privacy_risk=possible`이었습니다.

최종 production alias에서도 합성 이미지 한 건을 `POST /api/analyze`로 전송해 HTTP 200, `model=gpt-5-mini-2025-08-07`, `decisionAuthority=human`, `recommendation=ready_for_human_review`, `Cache-Control: no-store`를 확인했습니다. 이는 production 연결과 사람 최종판단 계약을 확인한 한 건의 실행 증거일 뿐, 성능·정확도 측정이나 실제 사용자·고용 성과를 뜻하지 않습니다.

### Production 브라우저 검증

최종 alias에서 `/`, `/app.mjs`, `/assets/synthetic-workcell.svg`는 모두 HTTP 200을 반환했습니다. `GET /api/analyze`는 의도대로 HTTP 405와 `Allow: POST`, `Cache-Control: no-store`를 반환했습니다. Chromium에서는 1440×810 제조·운영 코디네이터와 390×844 소상공인·데이터 오퍼레이터 경로를 확인했으며, 두 화면 모두 `scrollWidth=innerWidth`, `workcellLoaded=true`, 콘솔 오류·경고 0건이었습니다.

## 대표 화면

아래 제출용 화면은 모두 1440×810 PNG이며, 구현된 역할·현장·검수 흐름을 보여 줍니다.

1. [제조 홈](assets/submission/wanted-ai-championship-2026/01-manufacturing-home.png)
2. [실제 AI 보조검수](assets/submission/wanted-ai-championship-2026/02-live-ai-review.png)
3. [독립 사람 검수](assets/submission/wanted-ai-championship-2026/03-independent-human-review.png)
4. [소상공인 홈](assets/submission/wanted-ai-championship-2026/04-small-business-home.png)
5. [청년 경력 증거](assets/submission/wanted-ai-championship-2026/05-youth-career-evidence.png)

### 구현하지 않은 범위

실제 운영 인증과 권한, 영구 저장, 결제·지급, 로봇 제어, 모델 학습은 구현하지 않았습니다. 검증된 사용자·고객·파트너십·매출·고용 성과·모델 성능 개선도 주장하지 않습니다.

제조와 소상공인 예시는 모두 `AI-generated synthetic example`입니다. 실제 현장에서 수집한 자료, 청년 수행 결과, 파트너 제공 데이터, 학습 승인을 받은 데이터가 아닙니다.

## 제안 직무

다음 여섯 경로는 제품이 검증하려는 제안이며, 달성된 고용 성과가 아닙니다.

1. 현장 데이터 코디네이터
2. Physical AI 데이터 오퍼레이터
3. 데이터 품질·안전 검수자
4. 데이터 권리 관리자
5. 현장 적용 전문가
6. 재수집 운영자

## 데이터와 출처

- [`public/data/catalog.json`](public/data/catalog.json): 합성 시나리오, 제안 직무, 외부 카탈로그 후보
- [`public/assets/asset-manifest.json`](public/assets/asset-manifest.json): 현재 합성 이미지 3개의 해시·권리 경계와 향후 로컬 imagegen 자산이 따라야 할 출처 기록 규격

KAMP AI, AI Hub, data.go.kr은 모두 `External catalog link` 상태의 후보입니다. 데이터 다운로드, 캐시, API 호출, 키 사용이 없으며 `Live API`가 아닙니다. 특정 데이터셋을 도입하기 전에는 공식 제공처에서 이용조건을 별도로 확인해야 합니다.

## 수집 원칙

수집은 현장 동의, 교육, 안전, 허용 작업 범위, 보상조건 확인의 다섯 관문을 모두 통과해야 합니다. 수집자와 최종 검수자는 분리하며, AI 신호만으로 승인하지 않습니다. 수집 상태, 검수 상태, 접근 권한, 보상 상태는 서로 다른 기록으로 유지하는 것이 제품 원칙입니다.

## 검증

```sh
npm run check
```

`npm run check`는 공개 허용목록 빌드 후 전체 Node 테스트를 실행합니다. 테스트는 반응형 UI 계약과 상태 전이, API 입력·같은 출처·엄격한 응답 스키마, JSON 결정성, 합성·권리 경계, PII·비밀 패턴 부재, 배포 준비 결과의 허용 파일·해시를 확인합니다. `npm run deploy:prepare`는 이 검증 뒤 정적 공개 파일, 단일 서버 함수, 최소 설정만 별도 임시 디렉터리에 모으며 그 명령 자체는 실제 배포를 수행하지 않습니다. 위 공개 URL의 production 배포와 런타임 검증은 이 준비 단계 이후 별도로 수행했습니다.

## 클린룸 작성 범위

이 저장소의 README, 제출 초안, 공개 카탈로그, 자산 출처 규격, 검증 테스트는 이 저장소를 위해 새로 작성했습니다. 다른 저장소의 소스 코드, UI 마크업, 스크린샷, 문구, 데이터, 기여자 자산을 가져오지 않았습니다. 이 설명은 이번에 새로 작성한 파일의 출처를 한정할 뿐이며, 다른 저장소나 사람의 별도 이력을 삭제·대체·재작성했다는 뜻이 아닙니다.

## 라이선스 경계

루트 [`LICENSE`](LICENSE)의 MIT 조건은 이 저장소에서 새로 작성한 소프트웨어 코드와 테스트에만 적용됩니다. 문서, 카탈로그 데이터, 프롬프트, 래스터 이미지와 기타 미디어는 자동으로 MIT가 되지 않습니다. 특히 래스터 자산은 `public/assets/asset-manifest.json`의 개별 기록이 명시적으로 사용 권한을 부여할 때만 그 범위에서 사용할 수 있습니다.
