"use client";

import { useEffect, useRef } from "react";
import { subscribeToUserEvents, type WorklenzEvent } from "./events";

export function useUserEvents(
  userId: string,
  onEvent: (event: WorklenzEvent) => void
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const unsubscribe = subscribeToUserEvents(userId, (event) => {
      onEventRef.current(event);
    });
    return unsubscribe;
  }, [userId]);
}
