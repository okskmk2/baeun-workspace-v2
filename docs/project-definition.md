# 프로젝트 정의 메모 (README 초안용)

작성일: 2026-09-20. 소스: 라우트, 랜딩 i18n, IA.md, permissions.md, 결제 문서, package.json, backend/src/index.mjs.

이 파일은 README를 쓰기 전에 코드·문서를 대조해 정리한 작업 메모다. 제품 정의의 근거를 남긴다.

---

## 한 줄

바은 워크스페이스(Baeun Workspace)는 팀의 문서·할 일·대화·데이터를 프로젝트 한곳에 두고, 그 위를 워크스페이스(조직)와 슬롯 과금으로 운영하는 협업 SaaS다.

## 제품 이름

- 브랜드: 바은 워크스페이스 (`landing.brand`, GNB)
- 레포: `baeun-workspace-v2`
- 운영 도메인: `https://workspace.baeun.com`
- 저작권 표기: Baeun Workspace

## 계층

```
회원(Member)
 └── 워크스페이스(조직 허브)
      └── 프로젝트(실제 일터)
           ├── 위키
           ├── 칸반 (보드 / 백로그 / 간트 / 태스크)
           ├── 채널 (공지 / 일반 / 태스크 / DM / 에이전트)
           └── 데이터 (테이블)
```

랜딩 카피: "팀 공간과 업무 공간을 나눴습니다."
- 워크스페이스 = 공지, 게시판, 멤버를 관리하는 팀 공간
- 프로젝트 = 위키, 칸반, 채널, 데이터로 일하는 공간

## 네 사이트 (단일 SPA)

| 사이트 | URL | 역할 |
|---|---|---|
| 퍼블릭 | `/` | 랜딩, 요금, 가입/로그인, 계정 설정, 스토어, 공개 카탈로그 |
| 워크스페이스 | `/workspace/:id` | 프로젝트 허브, 게시판, 랭킹, 조직 설정·라이선스 |
| 프로젝트 | `/project/:id` | 위키·칸반·채널·데이터. 루트는 위키로 보냄 |
| 어드민 | `/admin` | `SYSTEM_ADMIN` 백오피스. 테넌트 화면을 복제하지 않음 |

계정 → 워크스페이스 → 프로젝트. 프로젝트 URL에 워크스페이스 ID를 넣지 않는다. 사이트 간 이동은 Context Switcher.

## 핵심 기능 (구현된 것)

- 위키: 페이지 트리, 마크다운/리치텍스트, 파일, 페이지 단위 OWNER/EDITOR/VIEWER, 편집 권한 신청
- 칸반: 보드, 태스크(담당·보고·검토·감시), 백로그, 간트, 아카이브. 태스크 채널과 연결
- 채널: WebSocket 실시간 메시지. NOTICE는 OWNER/ADMIN만 작성
- 데이터: 워크스페이스 자산 / 프로젝트 로컬 테이블, 행 CRUD, 스키마, TSV. form/chart는 플레이스홀더
- AI 어시스턴트: Gemini. 프로젝트 컨텍스트 질의, 위키 → 데이터 테이블 추출/적재(미리보기 후 승인)
- 알림, 프로젝트 검색, 실시간 SharedWorker
- 공개 워크스페이스/프로젝트 카탈로그 (`/open-projects`) + 어드민 검수
- 가입 승인 큐 (어드민이 승인해야 로그인)

## 과금

티어(Free/Pro)가 아니라 **슬롯**. 사용한 만큼 매달 결제. Polar.sh.

무료 한도: 워크스페이스 1, 워크스페이스당 프로젝트 3, 워크스페이스당 멤버 5(소유자 포함). 저장 5GB/워크스페이스, 초과 $0.10/GB.

상품: WORKSPACE(계정 풀), PROJECT(워크스페이스 귀속), WORKSPACE_MEMBER(워크스페이스 귀속).

만료 원칙: 이미 만든 조직·사람·일은 지우지 않는다. 막는 것은 새 생성·초대만 (`402 SLOT_EXHAUSTED`). 결제 주기는 구매 건(구독)마다 독립.

## 권한

계층형 RBAC. 워크스페이스/프로젝트 OWNER·ADMIN·MEMBER. 페이지 OWNER·EDITOR·VIEWER. 전역 `SYSTEM_ADMIN`. 상세는 `docs/permissions.md`.

## 기술

- 프론트: Vue 3, Vite(8081, `/api` → 8080), Pinia, Vue Router, vue-i18n (ko/en)
- 백엔드: Express 5 ESM, PostgreSQL(`pg` + 세션 스토어), `ws`, bcrypt, Winston, Swagger `/docs`
- 파일: GCS (`GCS_BUCKET`, 기본 `workspace.baeun.com`)
- AI: `@google/genai`, 기본 모델 `gemini-3.1-flash-lite`
- 결제: Polar sandbox/production
- 배포: Cloud Run `baeun-workspace-v2` (asia-northeast1), GCP 프로젝트 `baeun-workspace-dev`. `app.yaml`도 존재. 프로덕션에서 백엔드가 `frontend/dist`를 서빙하고 SPA fallback.

## 아직 얇은 부분 (IA.md 기준)

- 워크스페이스 게시판 5면, 랭킹: 라우트 있음, UI 와이어프레임
- 어드민 결제·시스템 방송 UI: 플레이스홀더 (백엔드 API는 일부 있음)
- 데이터 form/chart: 준비 중
- 전역 캐치올 404 없음

## README에 넣을 것 / 넣지 말 것

넣을 것: 한 줄 정의, 계층, 네 사이트, 도구 네 가지, 슬롯 과금, 스택, 디렉터리, 실행/배포, docs 링크.

넣지 말 것: IA 전체 사이트맵, 권한 표 전부, 마케팅 카피 후보. 그건 기존 docs가 담당.
