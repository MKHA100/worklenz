-- Migration 5: Add priority, startDate, timeEstimate to Task
ALTER TABLE "Task"
  ADD COLUMN IF NOT EXISTS "priority"      TEXT    NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "startDate"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "timeEstimate"  INTEGER;
