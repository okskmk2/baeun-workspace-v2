# 권한(Permission) 시스템 문서

## 개요

이 프로젝트는 **계층형 역할 기반 접근 제어(RBAC)** 를 사용합니다.  
권한은 워크스페이스 → 프로젝트 → 리소스(페이지·채널·칸반·태스크·데이터)의 계층 구조로 독립 관리됩니다.

---

## 1. 역할(Role) 정의

### 1.1 워크스페이스 역할 (`workspace_member.role_name`)

| 역할 | 설명 |
|------|------|
| `OWNER` | 워크스페이스 소유자. 모든 작업 가능(삭제 포함). 최소 1명 유지 필수 |
| `ADMIN` | 멤버 초대·제거, 워크스페이스 수정 가능 |
| `MEMBER` | 읽기 위주. 프로젝트 조회 가능 |

### 1.2 프로젝트 역할 (`project_member.role_name`)

| 역할 | 설명 |
|------|------|
| `OWNER` | 프로젝트 소유자. 수정·삭제·멤버 관리 가능 |
| `ADMIN` | 멤버 추가·제거 가능 |
| `MEMBER` | 프로젝트 내 리소스 접근 가능 |

### 1.3 채널 역할 (`channel_member.role_name`)

| 역할 | 설명 |
|------|------|
| `OWNER` | 채널 소유자 |
| `ADMIN` | 채널 관리 가능 |
| `MEMBER` | 채널 메시지 조회·작성 가능 |

> **공지(NOTICE) 채널**: 메시지 작성은 `OWNER` 또는 `ADMIN`만 가능

### 1.4 칸반 역할 (`kanban_member.role_name`)

| 역할 | 설명 |
|------|------|
| `MEMBER` | 기본값. 칸반 접근 가능 |

### 1.5 페이지 역할 (`page_member.role_name`)

| 역할 | 설명 |
|------|------|
| `OWNER` | 페이지 소유자. 수정·삭제 가능 |
| `EDITOR` | 페이지 편집 가능 |
| `VIEWER` | 읽기 전용 |

### 1.6 태스크 역할 (`task_member.role_name`)

| 역할 | 설명 |
|------|------|
| `REPORTER` | 태스크 생성자 |
| `ASSIGNEE` | 담당자 |
| `REVIEWER` | 검토자 |
| `WATCHER` | 감시자(알림만 수신) |

### 1.7 데이터 컬럼 권한 (`data_column.permissions` JSONB)

컬럼별로 읽기·쓰기 역할을 JSONB로 저장합니다.

```json
{
  "readRoles": ["OWNER", "ADMIN", "MEMBER"],
  "writeRoles": ["OWNER", "ADMIN"]
}
```

---

## 2. 데이터베이스 스키마

```sql
-- 전역 멤버
CREATE TABLE member (
  role_name varchar(20) DEFAULT 'MEMBER'
);

-- 워크스페이스 멤버
CREATE TABLE workspace_member (
  role_name varchar(20) DEFAULT 'MEMBER'
    CHECK (role_name IN ('OWNER', 'ADMIN', 'MEMBER'))
);

-- 프로젝트 멤버
CREATE TABLE project_member (
  role_name varchar(20) DEFAULT 'MEMBER'
    CHECK (role_name IN ('OWNER', 'ADMIN', 'MEMBER'))
);

-- 채널 멤버
CREATE TABLE channel_member (
  role_name varchar(20) DEFAULT 'MEMBER'
    CHECK (role_name IN ('OWNER', 'ADMIN', 'MEMBER'))
);

-- 칸반 멤버
CREATE TABLE kanban_member (
  role_name varchar(20) DEFAULT 'MEMBER'
);

-- 페이지 멤버
CREATE TABLE page_member (
  role_name varchar(20)
    CHECK (role_name IN ('OWNER', 'EDITOR', 'VIEWER'))
);

-- 태스크 참여자
CREATE TABLE task_member (
  role_name varchar(50)
    CHECK (role_name IN ('REPORTER', 'ASSIGNEE', 'REVIEWER', 'WATCHER'))
);

-- 데이터 컬럼 권한 (JSONB)
CREATE TABLE data_column (
  permissions jsonb DEFAULT '{"readRoles":["OWNER","ADMIN","MEMBER"],"writeRoles":["OWNER","ADMIN"]}'
);
```

---

## 3. 백엔드 권한 체크

### 3.1 인증 미들웨어 (`auth.middleware.mjs`)

| 미들웨어 | 조건 | 실패 응답 |
|----------|------|-----------|
| `isAuth` | `req.session.userId` 존재 | `401 Unauthorized` |
| `isGuest` | 세션 없음(미로그인) | `400 Bad Request` |
| `isSystemAdmin` | `member.role_name === SYSTEM_ADMIN` (`isAuth` 이후) | `403 Forbidden` |

### 3.2 프로젝트 멤버십 미들웨어 (`projectMember.middleware.mjs`)

`project_member` 테이블에서 멤버 여부를 확인합니다.  
멤버가 아니면 `403 Forbidden`을 반환합니다.

### 3.3 라우트별 권한 요약

#### 워크스페이스 (`workspace.route.mjs`)

| 작업 | 필요 역할 |
|------|-----------|
| 조회 | 로그인(`isAuth`) |
| 수정 | `OWNER` 또는 `ADMIN` |
| 멤버 초대 | `OWNER` 또는 `ADMIN` |
| 멤버 제거 | `OWNER` 또는 `ADMIN` |
| 삭제 | `OWNER` (기본 워크스페이스 제외) |

#### 프로젝트 (`project.route.mjs`)

| 작업 | 필요 역할 |
|------|-----------|
| 조회 | 로그인 + 프로젝트 멤버 |
| 생성 | 워크스페이스 `OWNER` 또는 `ADMIN` |
| 수정 | 프로젝트 `OWNER` |
| 멤버 추가 | 프로젝트 `OWNER` |
| 멤버 제거 | 프로젝트 `OWNER` |
| 삭제 | 프로젝트 `OWNER` |

#### 페이지 (`pages.route.mjs`)

| 작업 | 필요 역할 |
|------|-----------|
| 조회 | 로그인 + 프로젝트 멤버 |
| 생성·수정·삭제 | 페이지별 역할 확인 |

#### 칸반 (`kanban.route.mjs`)

| 작업 | 필요 역할 |
|------|-----------|
| 접근 | 로그인 + 프로젝트 멤버 |

#### 태스크 (`task.route.mjs`)

| 작업 | 필요 역할 |
|------|-----------|
| 접근 | 로그인 + 프로젝트 멤버 |

#### 채널·공지 (`chat.route.mjs`)

| 작업 | 필요 역할 |
|------|-----------|
| 메시지 조회 | 채널 멤버 |
| 일반 채널 메시지 작성 | 채널 멤버 |
| 공지(NOTICE) 채널 메시지 작성 | `OWNER` 또는 `ADMIN` |

#### 데이터 테이블 (`data.route.mjs`)

| 작업 | 필요 역할 |
|------|-----------|
| 데이터 조회 | 컬럼별 `readRoles` 포함 역할 + `is_visible=true` |
| 데이터 수정 | 컬럼별 `writeRoles` 포함 역할 |
| 테이블 생성 | 프로젝트 `OWNER` 또는 `ADMIN` |

#### 라이선스 (`license.route.mjs`)

| 작업 | 필요 역할 |
|------|-----------|
| 접근 | 로그인(`isAuth`) — 추가 역할 검증은 백엔드 내부 처리 |

---

## 4. 프론트엔드 권한 체크

### 4.1 라우터 글로벌 가드 (`router.js`)

`beforeEach` 훅에서 라우트 메타 정보를 읽어 접근을 제어합니다.

```
1. requiresAuth → 로그인 여부 확인
2. requiresAdmin → role_name === SYSTEM_ADMIN, 아니면 /
3. requiresProjectAdmin → projectMemberStore에서 역할 조회
   - OWNER 또는 ADMIN: 진입 허용
   - 그 외: /project/:id/kanban 으로 redirect
```

### 4.2 라우트 메타 속성

| 메타 속성 | 적용 라우트 | 동작 |
|-----------|-------------|------|
| `requiresAuth: true` | 워크스페이스, 어드민 라우트 전체 | 미로그인 시 로그인 페이지로 redirect |
| `requiresAdmin: true` | `/admin/**` | `role_name !== SYSTEM_ADMIN`이면 `/`로 redirect |
| `requiresProjectAdmin: true` | `/project/:id/settings/**` | 프로젝트 `OWNER`·`ADMIN`이 아니면 칸반으로 redirect |

### 4.3 관련 스토어

| 스토어 | 역할 |
|--------|------|
| `appStore.js` | 현재 로그인 사용자 정보(ID 등) 보관 |
| `projectMemberStore.js` | 프로젝트 멤버 목록 및 역할 캐싱 |

---

## 5. 권한 체크 흐름

```
[사용자 요청]
      │
      ▼
[프론트엔드 라우터 가드]
  ├─ requiresAuth: 로그인 확인
  └─ requiresProjectAdmin: OWNER/ADMIN 확인
      │ 실패 → redirect
      │
      ▼
[백엔드 API]
  ├─ isAuth 미들웨어: 세션 확인 → 실패 시 401
  ├─ requireProjectMember 미들웨어: 멤버십 확인 → 실패 시 403
  └─ 라우트 핸들러: 역할 확인 → 실패 시 403
      │
      ▼
[데이터베이스]
  └─ *_member 테이블에서 role_name 조회
```

---

## 6. 관련 파일 경로

### 백엔드
- [auth.middleware.mjs](../backend/src/middlewares/auth.middleware.mjs) — 인증 미들웨어
- [projectMember.middleware.mjs](../backend/src/middlewares/projectMember.middleware.mjs) — 프로젝트 멤버십 확인
- [workspace.route.mjs](../backend/src/routes/workspace.route.mjs) — 워크스페이스 권한
- [project.route.mjs](../backend/src/routes/project.route.mjs) — 프로젝트 권한
- [pages.route.mjs](../backend/src/routes/pages.route.mjs) — 페이지 권한
- [kanban.route.mjs](../backend/src/routes/kanban.route.mjs) — 칸반 권한
- [task.route.mjs](../backend/src/routes/task.route.mjs) — 태스크 권한
- [chat.route.mjs](../backend/src/routes/chat.route.mjs) — 채널/공지 권한
- [data.route.mjs](../backend/src/routes/data.route.mjs) — 데이터 테이블 권한
- [license.route.mjs](../backend/src/routes/license.route.mjs) — 라이선스 접근. 생성·수정·지급·사용량은 `isSystemAdmin`
- [admin.route.mjs](../backend/src/routes/admin.route.mjs) — 대시보드·회원 제재·테넌트·공개 검수·결제 환불·방송·감사 로그
- [ddl.sql](../backend/sql/ddl.sql) — 전체 DB 스키마

### 프론트엔드
- [router.js](../frontend/src/router.js) — 글로벌 라우터 가드
- [project.js](../frontend/src/routes/project.js) — 프로젝트 라우트 정의
- [workspace.js](../frontend/src/routes/workspace.js) — 워크스페이스 라우트
- [admin.js](../frontend/src/routes/admin.js) — 어드민 라우트
- [appStore.js](../frontend/src/stores/appStore.js) — 사용자 정보 스토어
- [projectMemberStore.js](../frontend/src/stores/projectMemberStore.js) — 프로젝트 멤버 역할 스토어
