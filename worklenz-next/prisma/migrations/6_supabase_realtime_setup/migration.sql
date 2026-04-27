-- Migration 6: Enable Supabase Realtime for Task table
-- Run this in the Supabase SQL editor (Dashboard → SQL editor)
-- Required for live task updates across browser tabs / multiple users

-- Allow Supabase to capture full row data on UPDATE events
ALTER TABLE "Task" REPLICA IDENTITY FULL;

-- Add the Task table to the realtime publication
-- (If already added, this is a no-op)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'Task'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "Task";
  END IF;
END $$;
