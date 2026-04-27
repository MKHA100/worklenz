import { createClient } from "@/lib/supabase/client";

export type WorklenzEvent = {
  event: string;
  entity: string;
  id: string;
  payload: Record<string, unknown>;
  actor: string;
  timestamp: string;
};

export function subscribeToProjectEvents(projectId: string, onEvent: (event: WorklenzEvent) => void) {
  const supabase = createClient();

  const channel = supabase
    .channel(`project:${projectId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "Task",
        filter: `projectId=eq.${projectId}`
      },
      (payload) => {
        const row = (payload.new ?? payload.old ?? {}) as Record<string, unknown>;
        onEvent({
          event: payload.eventType,
          entity: "task",
          id: String(row["id"] ?? ""),
          payload: row,
          actor: "system",
          timestamp: new Date().toISOString()
        });
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
