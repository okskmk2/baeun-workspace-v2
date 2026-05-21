# AI 에이전트 위젯 데이터 작업 실행 설계

## 배경
현재 AI 위젯은 프로젝트 컨텍스트를 조회/요약하는 데 강하지만, Data 메뉴에서 실제로 테이블을 생성하고 데이터를 적재하는 실행 권한/실행 경로가 부족합니다.

## 목표
사용자 요청(예: "위키의 admin api spec을 읽고 데이터 메뉴에 테이블 생성 후 데이터 적재")을 안전하게 자동 실행한다.

## 핵심 방향
- LLM은 판단/계획을 담당
- 백엔드는 실행/권한/감사로그를 담당
- 에이전트는 허용된 내부 도구만 호출 가능(임의 SQL 직접 실행 금지)

## 기능 단계 분해
1. 위키 페이지에서 스펙 텍스트 수집
2. 스키마/레코드 추출
3. Data 메뉴 테이블 생성
4. 배치 적재
5. 검증 및 결과 보고
6. 실패 시 재시도/롤백

## 아키텍처
### 1) Planner
자연어 요청을 실행 계획으로 변환한다.

### 2) Executor
내부 API(tool)를 호출해 실제 변경 작업을 수행한다.

### 3) Verifier
적재 건수/실패 건수/무결성 검증 결과를 계산한다.

### 4) Conversation
중간 확인 질문(스키마 확정, 키 충돌 정책 등)을 처리한다.

## Tool API 설계
- `get_wiki_page(page_id)`
- `extract_table_schema_from_spec(markdown)`
- `preview_import_diff(project_id, table_schema, rows)`
- `create_data_table(project_id, table_name, columns, options)`
- `insert_data_rows(project_id, table_id, rows, upsert_key)`
- `validate_table_data(project_id, table_id, rules)`
- `get_job_status(job_id)`

## 실행 상태 머신
- `draft`
- `awaiting_user_confirm`
- `running`
- `completed`
- `failed`
- `rollback_available`

각 단계는 UI에 진행률/로그를 노출한다.

## 권한/보안/감사
- 역할 기반 권한 체크(테이블 생성/적재)
- 고위험 작업 2단계 확인
- 감사로그(요청자, 실행시간, 변경 행 수, 실패 행 사유)
- PII/시크릿 마스킹
- Row limit/rate limit/timeout/idempotency key 적용

## 데이터 적재 정책
- 타입 추론 실패 시 사용자 확인
- 기본키/유니크키/인덱스 자동 제안
- 배치 인서트 + 부분 실패 리포트
- 재실행 중복 방지(upsert 전략)

## 프롬프트/정책
- 조회 intent와 실행 intent를 분리
- 실행 intent면 반드시 다음 순서를 강제
  1. 실행 계획 제시
  2. 영향 범위 요약
  3. 사용자 승인
  4. 실행
  5. 검증 리포트

## UI/UX
- 실행 전: 생성될 스키마 미리보기
- 실행 중: 단계별 상태 표시
- 실행 후: 성공/실패 건수, 실패 사유, 재시도 버튼
- 결과 링크: 생성된 테이블 바로가기

## 왜 기존 응답이 보수적이었는가
에이전트가 Data 메뉴의 실행 capability를 컨텍스트로 명확히 인지하지 못해 "환경 정보 누락"으로 답변했을 가능성이 높다. 기능 부재라기보다 도구-권한 모델링 부재 문제다.

## 권장 구현 순서(MVP)
1. 최소 Tool API 3개 구현(테이블 생성/행 적재/작업 조회)
2. 에이전트 tool-calling 연결
3. 승인 플로우 추가
4. 감사로그/롤백 추가
5. 위키 파싱 자동화 고도화

## 구현 시작 상태 (2026-05-21)
다음 MVP 실행 엔드포인트를 우선 구현했다.

- `POST /api/assistant/actions/wiki-to-data`

요청 본문
```json
{
  "project_id": 4,
  "page_id": 115,
  "table_name": "admin_api_spec",
  "dry_run": true,
  "max_rows": 200
}
```

동작
1. 프로젝트 권한(OWNER/ADMIN) 확인
2. 위키 페이지 본문에서 마크다운 표 파싱
3. 컬럼 타입(TEXT/NUMBER/DATE) 추론
4. `dry_run=true`면 스키마/샘플 행 미리보기 반환
5. `dry_run=false`면 데이터 테이블/컬럼/행 실제 생성

응답 예시(dry_run)
```json
{
  "dry_run": true,
  "preview": {
    "source": {
      "page_id": 115,
      "page_title": "admin api spec"
    },
    "inferred_schema": {
      "table_name": "admin_api_spec",
      "columns": [
        { "name": "endpoint", "type": "TEXT" }
      ]
    },
    "row_count": 32,
    "row_sample": []
  }
}
```

남은 작업
1. 사용자 승인 단계(`awaiting_user_confirm`) UI 노출
2. 실패 행 상세 리포트/재시도 전략 추가

## 추가 구현 상태 (2026-05-21)
채팅 API에서 실행형 요청을 감지해 위 액션 endpoint를 직접 호출하도록 연결했다.

- 대상 route: `POST /api/assistant/chat`
- 실행 의도 감지: 위키 + 데이터 적재/테이블 생성 관련 키워드
- 페이지 식별: 메시지/히스토리에서 wiki 링크 또는 page id 파싱
- 승인 흐름:
  - 확인 키워드가 없으면 `dry_run=true` 미리보기 응답
  - 사용자가 "실행해/진행해" 등 확인 시 실제 생성/적재 실행

예시 대화
1. 사용자: "위키의 admin api spec으로 데이터 테이블 만들어"
2. 에이전트: 컬럼 수/행 수 미리보기 + "실행해" 요청
3. 사용자: "실행해"
4. 에이전트: 생성 완료 + 데이터 테이블 링크 반환
