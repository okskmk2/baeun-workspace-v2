-- Migration: add due_date to task
-- Description: 작업 마감일자 컬럼 추가

ALTER TABLE task
  ADD COLUMN IF NOT EXISTS due_date timestamptz DEFAULT NULL;
