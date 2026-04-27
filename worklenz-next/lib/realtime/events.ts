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

  function makeTaskEvent(payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }): WorklenzEvent {
    const row = (payload.new ?? payload.old ?? {}) as Record<string, unknown>;
    return {
      event: payload.eventType,
      entity: "task",
      id: String(row["id"] ?? ""),
      payload: row,
      actor: "system",
      timestamp: new Date().toISOString()
    };
  }

  function makeMemberEvent(payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }): WorklenzEvent {
    const row = (payload.new ?? payload.old ?? {}) as Record<string, unknown>;
    return {
      event: payload.eventType,
      entity: "project_member",
      id: String(row["id"] ?? ""),
      payload: row,
      actor: "system",
      timestamp: new Date().toISOString()
    };
  }

  function makeBroadcastEvent(entity: string, payload: Record<string, unknown>): WorklenzEvent {
    return {
      event: "BROADCAST",
      entity,
      id: String(payload["taskId"] ?? ""),
      payload,
      actor: "system",
      timestamp: new Date().toISOString()
    };
  }

  const channel = supabase
    .channel(`project:${projectId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "Task", filter: `projectId=eq.${projectId}` },
      (payload) => onEvent(makeTaskEvent(payload as Parameters<typeof makeTaskEvent>[0]))
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ProjectMember", filter: `projectId=eq.${projectId}` },
      (payload) => onEvent(makeMemberEvent(payload as Parameters<typeof makeMemberEvent>[0]))
    )
    .on("broadcast", { event: "task_submission_changed" }, ({ payload }) =>
      onEvent(makeBroadcastEvent("task_submission", payload as Record<string, unknown>))
    )
    .on("broadcast", { event: "task_attachment_changed" }, ({ payload }) =>
      onEvent(makeBroadcastEvent("task_attachment", payload as Record<string, unknown>))
    )
    .on("broadcast", { event: "task_member_changed" }, ({ payload }) =>
      onEvent(makeBroadcastEvent("task_member", payload as Record<string, unknown>))
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
