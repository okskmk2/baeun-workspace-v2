-- 채널 공지(NOTICE) 기능 제거: 공지는 워크스페이스 게시판 공지사항으로 일원화
DELETE FROM notification
WHERE type IN ('channel.notice_project_new_message', 'channel.notice_workspace_new_message');

DELETE FROM channel WHERE type = 'NOTICE';

ALTER TABLE channel DROP CONSTRAINT IF EXISTS channel_type_check;
ALTER TABLE channel ADD CONSTRAINT channel_type_check
    CHECK (type IN ('GENERAL', 'DM', 'TASK', 'AGENT'));
