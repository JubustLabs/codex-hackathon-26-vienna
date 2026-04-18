import { useCallback, useEffect, useRef, useState } from "react";

import type { RoomSnapshot, RoomSocketServerMessage } from "@shared/contracts";

import { api } from "@/lib/api";

export function useLiveRoom(
  roomId: string | undefined,
  viewerId: string | undefined,
) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const viewerRef = useRef(viewerId);
  useEffect(() => {
    viewerRef.current = viewerId;
  }, [viewerId]);

  const refresh = useCallback(async () => {
    if (!roomId) {
      return;
    }
    try {
      setError(null);
      const next = await api.roomSnapshot(roomId, viewerRef.current);
      setSnapshot(next);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Failed to load room",
      );
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [roomId, viewerId, refresh]);

  useEffect(() => {
    if (!roomId) {
      return;
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(
      `${protocol}//${window.location.host}/ws?roomId=${roomId}${viewerId ? `&participantId=${viewerId}` : ""}`,
    );
    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data) as RoomSocketServerMessage;
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
    refresh,
  };
}
