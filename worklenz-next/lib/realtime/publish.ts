import { createClient } from "@supabase/supabase-js";
import type { RealtimeBroadcastEventName, RealtimeBroadcastPayloadByEvent } from "./contracts";

type PublishEventInput<E extends RealtimeBroadcastEventName = RealtimeBroadcastEventName> = {
  channel: string;
  event: E;
  payload: RealtimeBroadcastPayloadByEvent[E];
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

export async function publishRealtimeEvent<E extends RealtimeBroadcastEventName>(input: PublishEventInput<E>) {
  const channel = supabaseAdmin.channel(input.channel);
  try {
    return await channel.send({
      type: "broadcast",
      event: input.event,
      payload: {
        ...input.payload,
        timestamp: new Date().toISOString()
      }
    });
  } finally {
    await supabaseAdmin.removeChannel(channel);
  }
}

export async function publishRealtimeEventToUsers<E extends RealtimeBroadcastEventName>(
  userIds: string[],
  event: E,
  payload: RealtimeBroadcastPayloadByEvent[E]
) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) return;

  await Promise.allSettled(
    uniqueUserIds.map((userId) =>
      publishRealtimeEvent({
        channel: `user:${userId}`,
        event,
        payload
      })
    )
  );
}
