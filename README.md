# 바은 워크스페이스

팀의 **문서, 할 일, 대화, 데이터**를 프로젝트 한곳에서 쓰고, 그 위를 **워크스페이스(조직)** 와 **슬롯 과금**으로 운영하는 협업 플랫폼입니다.

랜딩 한 줄과 같습니다. 위키·칸반·채널·데이터를 프로젝트에서 함께 쓰고, 사용한 만큼만 매달 결제합니다.

- 제품 사이트: [workspace.baeun.com](https://workspace.baeun.com)
- 이 저장소: `baeun-workspace-v2` — Vue 3 프론트와 Express 백엔드를 한 앱으로 배포합니다.

---

## 이 제품이 하는 일

문서 도구, 이슈 보드, 메신저, 스프레드시트를 각각 켜면 같은 맥락을 여러 번 설명하게 됩니다. 바은은 그 네 가지를 **프로젝트** 안에 붙이고, 멤버·권한·라이선스는 **워크스페이스**에서 관리합니다.

```
회원
 └── 워크스페이스   팀 공간 (멤버, 게시판, 라이선스, 프로젝트 허브)
      └── 프로젝트  일터 (위키 · 칸반 · 채널 · 데이터)
```

| 공간 | 역할 |
| --- | --- |
| 워크스페이스 | 조직을 엽니다. 누구를 들이고, 프로젝트를 몇 개 둘지, 게시판·랭킹을 어디서 볼지 정합니다. |
| 프로젝트 | 실제로 일합니다. 문서를 쓰고, 보드로 진행하고, 채널에서 말하고, 표로 데이터를 다룹니다. |

프로젝트 URL에는 워크스페이스 ID를 넣지 않습니다. `/project/:id/...` 가 일터의 주소입니다.

---

## 네 개의 사이트, 하나의 SPA

로그인 사용자는 Context Switcher로 아래 네 네임스페이스를 오갑니다.

| 사이트 | 경로 | 하는 일 |
| --- | --- | --- |
| 퍼블릭 | `/` | 소개, 요금, 가입·로그인, 계정 설정, 스토어, 공개 프로젝트 목록 |
| 워크스페이스 | `/workspace/:id` | 프로젝트 허브, 사내 게시판, 랭킹, 조직 설정·결제 |
| 프로젝트 | `/project/:id` | 위키, 작업 보드, 메신저, 데이터. 기본 착지는 위키 |
| 어드민 | `/admin` | `SYSTEM_ADMIN` 전용 백오피스. 가입 승인, 테넌트, 라이선스, 공개 검수 |

가입은 어드민 승인 후에 로그인됩니다. 프로젝트 멤버가 아니면 `/project/:id/forbidden` 입니다.

화면·URL 전체는 [`docs/IA.md`](docs/IA.md), 역할은 [`docs/permissions.md`](docs/permissions.md)를 봅니다.

---

## 프로젝트 도구

프로젝트 GNB의 네 메뉴가 제품의 핵심입니다.

- **위키** — 페이지 트리, 문서, 첨부 파일. 페이지마다 소유자·편집자·뷰어. 편집 권한은 신청·승인 흐름이 있습니다.
- **칸반** — 보드, 백로그, 간트, 아카이브, 태스크(담당·보고·검토·감시). 태스크 채널과 이어집니다.
- **채널** — 공지·일반·업무·DM·에이전트. WebSocket으로 실시간입니다. 공지 작성은 채널 관리자만 가능합니다.
- **데이터** — 워크스페이스 표준 자산과 프로젝트 로컬 테이블. 행 편집, 스키마, 내려받기.

프로젝트 안 AI 어시스턴트(Gemini)는 위키·이슈·채널 맥락을 질의하고, 위키 문서를 데이터 테이블로 미리보기한 뒤 승인 받아 적재할 수 있습니다.

워크스페이스 게시판·랭킹과 데이터 form/chart 일부 화면은 라우트만 있고 UI는 아직 얇습니다. 구현 상태는 IA 문서 8절을 참고합니다.

---

## 과금: 요금제가 아니라 슬롯

정해진 Free/Pro 티어가 없습니다. 자리를 더 열 때만 삽니다. 결제는 [Polar](https://polar.sh)입니다.

| 슬롯 | 귀속 | 무료 |
| --- | --- | --- |
| 워크스페이스 | 계정 (소유자로 둘 수 있는 조직 수) | 1 |
| 프로젝트 | 그 워크스페이스 | 3 |
| 멤버 | 그 워크스페이스 (소유자 포함) | 5 |

워크스페이스마다 저장 5GB가 포함되고, 초과분은 GB당 월 $0.10입니다.

슬롯이 부족하거나 구독이 끊겨도 **이미 만든 조직·사람·일·파일은 지우지 않습니다.** 막는 것은 새 워크스페이스·프로젝트 생성과 신규 초대뿐입니다 (`402 SLOT_EXHAUSTED`). 결제 주기는 계정 전체 갱신일이 아니라 **구매 건(구독)마다 독립**입니다.

기획 세부는 [`docs/결제만료패널티.md`](docs/결제만료패널티.md)입니다.

---

## 저장소 구조

```
frontend/     Vue 3 + Vite + Pinia + Vue Router + vue-i18n
backend/      Express 5 (ESM) + PostgreSQL + WebSocket
docs/         IA, 권한, 과금, 랜딩 카피, 설계 메모
```

프로덕션에서는 백엔드가 `frontend/dist`를 서빙하고, `/api/*` 와 `/docs`(Swagger) 외 경로는 SPA로 넘깁니다.

| 계층 | 선택 |
| --- | --- |
| API | Express, `express-session` + `connect-pg-simple`, Winston |
| DB | PostgreSQL (`DATABASE_URL`). 스키마는 `backend/sql/` |
| 실시간 | `ws`, 프론트 SharedWorker |
| 파일 | Google Cloud Storage (`GCS_BUCKET`) |
| AI | `@google/genai` |
| 결제 | `@polar-sh/sdk`, 웹훅 `/api/webhooks/polar` |
| i18n | 한국어 / English |

프론트 개발 서버는 `8081`, `/api`를 백엔드 `8080`으로 프록시합니다.

---

## 실행

로컬은 PostgreSQL과 백엔드 환경 변수(`DATABASE_URL`, `SESSION_SECRET`, Polar·GCS·Gemini 키)가 필요합니다.

```bash
# 백엔드 (기본 8080)
cd backend
npm install
npm start

# 프론트 (기본 8081)
cd frontend
npm install
npm start
```

루트에서도 `npm run start:backend`, `npm run start:frontend` 를 쓸 수 있습니다.

배포는 GCP 프로젝트 `baeun-workspace-dev`의 Cloud Run 서비스 `baeun-workspace-v2`(asia-northeast1)입니다.

```bash
npm run deploy
```

`npm run build`는 프론트 프로덕션 빌드 후 백엔드 의존성을 설치합니다.

---

## 문서

| 문서 | 내용 |
| --- | --- |
| [docs/IA.md](docs/IA.md) | 네 사이트의 정보 구조, 라우트, 가드 |
| [docs/permissions.md](docs/permissions.md) | 워크스페이스·프로젝트·페이지·채널 RBAC |
| [docs/결제만료패널티.md](docs/결제만료패널티.md) | 슬롯 만료 시 잠그는 것 / 잠그지 않는 것 |
| [docs/marketing.md](docs/marketing.md) | 포지션, 카피 뱅크, 요금 메시지, 금지 표현 |
| [docs/public_landing_marketing_copy.md](docs/public_landing_marketing_copy.md) | 랜딩 카피 초안 (라이브와 다를 수 있음) |
| [docs/ai-data-agent-design.md](docs/ai-data-agent-design.md) | 위키 → 데이터 에이전트 설계 |
| [docs/project-definition.md](docs/project-definition.md) | 이 README를 쓰기 전에 코드를 대조한 정의 메모 |
| `backend/sql/ddl.sql` | 테이블 정의 |
| `/docs` (실행 중 백엔드) | OpenAPI / Swagger UI |
