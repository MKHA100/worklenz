-- Migration 7: Realtime table coverage + performance indexes

-- Ensure full row payloads are available for UPDATE/DELETE realtime events
ALTER TABLE "Task" REPLICA IDENTITY FULL;
ALTER TABLE "TaskMember" REPLICA IDENTITY FULL;
ALTER TABLE "ProjectMember" REPLICA IDENTITY FULL;

-- Ensure all task/member tables are included in Supabase realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'Task'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "Task";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'TaskMember'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "TaskMember";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'ProjectMember'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "ProjectMember";
  END IF;
END $$;

-- Performance indexes for common filters/sorts
CREATE INDEX IF NOT EXISTS "idx_task_project_createdAt" ON "Task"("projectId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_task_status_submitted_updated" ON "Task"("status", "submittedAt", "updatedAt");
CREATE INDEX IF NOT EXISTS "idx_projectMember_user_project" ON "ProjectMember"("userId", "projectId");
CREATE INDEX IF NOT EXISTS "idx_taskMember_user_task" ON "TaskMember"("userId", "taskId");
