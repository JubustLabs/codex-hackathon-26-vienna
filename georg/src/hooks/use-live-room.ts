import { useEffect, useEffectEvent, useState } from "react";

import type { RoomSnapshot } from "@shared/contracts";

import { api } from "@/lib/api";

export function useLiveRoom(roomId: string | undefined, viewerId: string | undefined) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useEffectEvent(async () => {
    if (!roomId) {
      return;
    }
    try {
      setError(null);
      const next = await api.roomSnapshot(roomId, viewerId);
      setSnapshot(next);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Failed to load room");
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [roomId, viewerId, refresh]);

  useEffect(() => {
    if (!roomId) {
      return;
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws?roomId=${roomId}${viewerId ? `&participantId=${viewerId}` : ""}`);
    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data) as { type: string };
      if (payload.type === "room.invalidate") {
        void refresh();
      }
    });
    return () => socket.close();
  }, [roomId, viewerId, refresh]);

  return {
    snapshot,
    loading,
    error,
    refresh: () => refresh(),
  };
}
