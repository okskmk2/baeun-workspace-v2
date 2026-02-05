-- 1. Member (사용자)
CREATE TABLE member (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL, -- 해시값 저장을 위해 넉넉하게 설정
    email VARCHAR(255) NOT NULL CONSTRAINT member_email_unique UNIQUE,
    img_url VARCHAR(512),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Feedback (채팅 리액션용 아이콘 등)
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    icon_img_path VARCHAR(512)
);

-- 3. Workspace (최상위 그룹)
CREATE TABLE workspace (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    member_id INTEGER REFERENCES member(id) ON DELETE SET NULL, -- 소유자 탈퇴 시 유지
    sort_order INTEGER DEFAULT 0,
    img_url VARCHAR(512),
    theme_json JSONB -- 테마 설정값 (색상, 폰트 등)
);
CREATE INDEX idx_workspace_member_id ON workspace(member_id);

-- 4. Workspace Member (워크스페이스 참여자)
CREATE TABLE workspace_member (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspace(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES member(id) ON DELETE CASCADE,
    role_name VARCHAR(20) DEFAULT 'MEMBER' NOT NULL, -- OWNER, ADMIN, MEMBER
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ws_member_ws_id ON workspace_member(workspace_id);
CREATE INDEX idx_ws_member_mem_id ON workspace_member(member_id);

-- 5. Project (워크스페이스 내 프로젝트)
CREATE TABLE project (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    workspace_id INTEGER REFERENCES workspace(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    img_url VARCHAR(512),
    theme_json JSONB
);
CREATE INDEX idx_project_workspace_id ON project(workspace_id);

-- 6. Project Member (프로젝트 참여자)
CREATE TABLE project_member (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES project(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES member(id) ON DELETE CASCADE,
    role_name VARCHAR(20) DEFAULT 'MEMBER' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_pj_member_pj_id ON project_member(project_id);

-- 7. Board (이슈 관리 보드)
CREATE TABLE board (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    project_id INTEGER REFERENCES project(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1 NOT NULL, -- 1: 활성, 0: 비활성
    type VARCHAR(30), -- KANBAN, SCRUM 등
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_board_project_id ON board(project_id);

-- 8. Board Member (보드 참여자)
CREATE TABLE board_member (
    id SERIAL PRIMARY KEY,
    board_id INTEGER REFERENCES board(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES member(id) ON DELETE CASCADE,
    role_name VARCHAR(20) DEFAULT 'MEMBER' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Issue (할 일/티켓)
CREATE TABLE issue (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    board_id INTEGER REFERENCES board(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT '백로그' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_issue_board_id ON issue(board_id);

-- 10. Issue Member (이슈 담당자)
CREATE TABLE issue_member (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER REFERENCES issue(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES member(id) ON DELETE CASCADE,
    role_name VARCHAR(50) NOT NULL, -- ASSIGNEE, REPORTER 등
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_issue_member_issue ON issue_member(issue_id);

-- 11. Page (문서/노트)
CREATE TABLE page (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    project_id INTEGER REFERENCES project(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES page(id) ON DELETE CASCADE, -- 하위 페이지 구조
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_page_project_id ON page(project_id);
CREATE INDEX idx_page_parent_id ON page(parent_id);

-- 12. Page Member (문서 권한 관리)
CREATE TABLE page_member (
    id SERIAL PRIMARY KEY,
    page_id INTEGER REFERENCES page(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES member(id) ON DELETE CASCADE,
    role_name VARCHAR(20) NOT NULL, -- EDITOR, VIEWER
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. Chatroom (채팅방)
CREATE TABLE chatroom (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    project_id INTEGER REFERENCES project(id) ON DELETE CASCADE,
    type VARCHAR(30), -- DIRECT, GROUP
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_chatroom_project_id ON chatroom(project_id);

-- 14. Chatroom Member (채팅방 참여자)
CREATE TABLE chatroom_member (
    id SERIAL PRIMARY KEY,
    chatroom_id INTEGER REFERENCES chatroom(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES member(id) ON DELETE CASCADE,
    role_name VARCHAR(20) DEFAULT 'MEMBER' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 15. Chat (메시지)
CREATE TABLE chat (
    id SERIAL PRIMARY KEY,
    chatroom_id INTEGER REFERENCES chatroom(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by INTEGER REFERENCES member(id) ON DELETE SET NULL, -- 작성자 탈퇴해도 메시지 유지
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_chat_chatroom_id ON chat(chatroom_id);

-- 16. Chat Feedback (메시지 리액션)
CREATE TABLE chat_feedback (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER REFERENCES chat(id) ON DELETE CASCADE,
    feedback_id INTEGER REFERENCES feedback(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES member(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_chat_feedback_chat ON chat_feedback(chat_id);



CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX "idx_session_expire" ON "session" ("expire");

ALTER TABLE project ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;