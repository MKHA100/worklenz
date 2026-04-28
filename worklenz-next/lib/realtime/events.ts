import { createClient } from "@/lib/supabase/client";
import {
  REALTIME_BROADCAST_EVENT_NAMES,
  isRealtimeBroadcastEventName,
  type RealtimeBroadcastEvent,
  type RealtimeBroadcastEventName,
  type RealtimeBroadcastPayloadByEvent
} from "./contracts";

export type RealtimeStatus = "SUBSCRIBED" | "TIMED_OUT" | "CHANNEL_ERROR" | "CLOSED";

export type PostgresEntity = "task" | "project_member" | "task_member";

type PgPayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
};

export type PostgresRealtimeEvent = {
  source: "postgres";
  entity: PostgresEntity;
  eventType: PgPayload["eventType"];
  id: string;
  row: Record<string, unknown>;
};

export type RealtimeSystemEvent = {
  source: "system";
  scope: "project" | "user";
  channel: string;
  status: RealtimeStatus;
  error?: Error;
};

export type WorklenzEvent = PostgresRealtimeEvent | RealtimeBroadcastEvent | RealtimeSystemEvent;

function makePostgresEvent(entity: PostgresEntity, payload: PgPayload): PostgresRealtimeEvent {
  const row = (payload.new ?? payload.old ?? {}) as Record<string, unknown>;
  return {
    source: "postgres",
    entity,
    eventType: payload.eventType,
    id: String(row["id"] ?? row["taskId"] ?? ""),
    row
  };
}

function makeBroadcastEvent<K extends RealtimeBroadcastEventName>(
  name: K,
  payload: RealtimeBroadcastPayloadByEvent[K]
): RealtimeBroadcastEvent {
  return {
    source: "broadcast",
    name,
    payload
  } as Extract<RealtimeBroadcastEvent, { name: K }>;
}

function hasAffectedUser(payload: unknown, userId: string): boolean {
  const ids = (payload as { affectedUserIds?: unknown })?.affectedUserIds;
  if (!Array.isArray(ids)) return false;
  return ids.includes(userId);
}

function handleBroadcast(
  name: string,
  payload: unknown,
  onEvent: (event: WorklenzEvent) => void,
  userId?: string
) {
  if (!isRealtimeBroadcastEventName(name)) return;
  if (userId && !hasAffectedUser(payload, userId)) return;

  onEvent(
    makeBroadcastEvent(
      name,
      payload as RealtimeBroadcastPayloadByEvent[typeof name]
    )
  );
}

export function subscribeToProjectEvents(projectId: string, onEvent: (event: WorklenzEvent) => void) {
  const supabase = createClient();
  const channelName = `project:${projectId}`;

  let channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "Task" },
      (payload) => {
        const p = payload as unknown as PgPayload;
        const row = (p.new ?? p.old ?? {}) as Record<string, unknown>;
        if (row["projectId"] !== projectId) return;
        onEvent(makePostgresEvent("task", p));
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ProjectMember" },
      (payload) => {
        const p = payload as unknown as PgPayload;
        const row = (p.new ?? p.old ?? {}) as Record<string, unknown>;
        if (row["projectId"] !== projectId) return;
        onEvent(makePostgresEvent("project_member", p));
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "TaskMember" },
      (payload) => {
        const p = payload as unknown as PgPayload;
        onEvent(makePostgresEvent("task_member", p));
      }
    );

  for (const eventName of REALTIME_BROADCAST_EVENT_NAMES) {
    channel = channel.on("broadcast", { event: eventName }, ({ payload }) => {
      handleBroadcast(eventName, payload, onEvent);
    });
  }

  channel = channel.subscribe((status, err) => {
    onEvent({
      source: "system",
      scope: "project",
      channel: channelName,
      status: status as RealtimeStatus,
      ...(err ? { error: err as Error } : {})
    });
  });

  return () => {
    void supabase.removeChannel(channel);
  };
}

// User-scoped subscription — for cross-project "my tasks" surfaces.
export function subscribeToUserEvents(userId: string, onEvent: (event: WorklenzEvent) => void) {
  const supabase = createClient();
  const channelName = `user:${userId}`;

  let channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "Task" },
      (payload) => {
        const p = payload as unknown as PgPayload;
        onEvent(makePostgresEvent("task", p));
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "TaskMember" },
      (payload) => {
        const p = payload as unknown as PgPayload;
        const row = (p.new ?? p.old ?? {}) as Record<string, unknown>;
        if (row["userId"] !== userId) return;
        onEvent(makePostgresEvent("task_member", p));
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ProjectMember" },
      (payload) => {
        const p = payload as unknown as PgPayload;
        const row = (p.new ?? p.old ?? {}) as Record<string, unknown>;
        if (row["userId"] !== userId) return;
        onEvent(makePostgresEvent("project_member", p));
      }
    );

  for (const eventName of REALTIME_BROADCAST_EVENT_NAMES) {
    channel = channel.on("broadcast", { event: eventName }, ({ payload }) => {
      handleBroadcast(eventName, payload, onEvent, userId);
    });
  }

  channel = channel.subscribe((status, err) => {
    onEvent({
      source: "system",
      scope: "user",
      channel: channelName,
      status: status as RealtimeStatus,
      ...(err ? { error: err as Error } : {})
    });
  });

  return () => {
    void supabase.removeChannel(channel);
  };
}
