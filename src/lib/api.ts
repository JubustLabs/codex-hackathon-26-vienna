import type {
  AdrSectionKey,
  OwnershipClaim,
  Participant,
  RoomMode,
  RoomSnapshot,
  RoomSummary,
  Workstream,
} from "@shared/contracts";

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: "Request failed" }))) as { error?: string };
    throw new Error(payload.error ?? "Request failed");
  }

  return (await response.json()) as T;
}

export const api = {
  bootstrap: () =>
    request<{
      rooms: RoomSummary[];
      guardrails: RoomSnapshot["guardrails"];
      patterns: RoomSnapshot["patterns"];
      components: RoomSnapshot["components"];
    }>("/api/bootstrap"),
  createRoom: (payload: {
    topic: string;
    decision: string;
    goal: string;
    nonGoals: string;
    scope: string;
    successBar: string;
    topicTags: string[];
  }) => request<RoomSummary>("/api/rooms", { method: "POST", body: JSON.stringify(payload) }),
  roomSnapshot: (roomId: string, viewerId?: string) =>
    request<RoomSnapshot>(`/api/rooms/${roomId}${viewerId ? `?viewerId=${viewerId}` : ""}`),
  joinRoom: (roomId: string, payload: { displayName: string; role: Participant["role"] }) =>
    request<Participant>(`/api/rooms/${roomId}/join`, { method: "POST", body: JSON.stringify(payload) }),
  setMode: (roomId: string, actorId: string, mode: RoomMode) =>
    request(`/api/rooms/${roomId}/mode`, { method: "POST", body: JSON.stringify({ actorId, mode }) }),
  addUtterance: (roomId: string, actorId: string, text: string) =>
    request(`/api/rooms/${roomId}/utterances`, { method: "POST", body: JSON.stringify({ actorId, text }) }),
  resolveAlignmentNode: (
    roomId: string,
    actorId: string,
    nodeId: string,
    resolution: "agreement" | "non_blocking" | "dissent",
    note?: string,
  ) =>
    request(`/api/rooms/${roomId}/alignment/${nodeId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ actorId, resolution, note }),
    }),
  synthesizeNow: (roomId: string, actorId: string) =>
    request(`/api/rooms/${roomId}/synthesize`, { method: "POST", body: JSON.stringify({ actorId }) }),
  submitAgentDelta: (roomId: string, actorId: string, text: string, sourceAgent: string, type = "agent_insight") =>
    request(`/api/rooms/${roomId}/agent-deltas`, {
      method: "POST",
      body: JSON.stringify({ actorId, text, sourceAgent, type }),
    }),
  promoteAgentDelta: (roomId: string, actorId: string, deltaId: string) =>
    request(`/api/rooms/${roomId}/agent-deltas/${deltaId}/promote`, {
      method: "POST",
      body: JSON.stringify({ actorId }),
    }),
  discardAgentDelta: (roomId: string, actorId: string, deltaId: string) =>
    request(`/api/rooms/${roomId}/agent-deltas/${deltaId}/discard`, {
      method: "POST",
      body: JSON.stringify({ actorId }),
    }),
  claim: (roomId: string, actorId: string, scopeType: OwnershipClaim["scopeType"], scopeId: string) =>
    request(`/api/rooms/${roomId}/claims`, {
      method: "POST",
      body: JSON.stringify({ actorId, scopeType, scopeId }),
    }),
  releaseClaim: (roomId: string, actorId: string, scopeType: OwnershipClaim["scopeType"], scopeId: string) =>
    request(`/api/rooms/${roomId}/claims?actorId=${actorId}&scopeType=${scopeType}&scopeId=${scopeId}`, {
      method: "DELETE",
    }),
  updateAdrSection: (roomId: string, actorId: string, section: AdrSectionKey, text: string) =>
    request(`/api/rooms/${roomId}/adr/sections/${section}`, {
      method: "POST",
      body: JSON.stringify({ actorId, text }),
    }),
  reviewAdrSection: (roomId: string, actorId: string, section: AdrSectionKey) =>
    request(`/api/rooms/${roomId}/adr/sections/${section}/review`, {
      method: "POST",
      body: JSON.stringify({ actorId }),
    }),
  regenerateAdrSection: (roomId: string, actorId: string, section: AdrSectionKey) =>
    request(`/api/rooms/${roomId}/adr/sections/${section}/regenerate`, {
      method: "POST",
      body: JSON.stringify({ actorId }),
    }),
  approveAdr: (roomId: string, actorId: string) =>
    request(`/api/rooms/${roomId}/adr/approve`, {
      method: "POST",
      body: JSON.stringify({ actorId }),
    }),
  generatePlan: (roomId: string, actorId: string) =>
    request(`/api/rooms/${roomId}/plan/generate`, {
      method: "POST",
      body: JSON.stringify({ actorId }),
    }),
  updatePlanItem: (roomId: string, actorId: string, itemId: string, patch: Partial<Workstream>) =>
    request(`/api/rooms/${roomId}/plan/items/${itemId}`, {
      method: "POST",
      body: JSON.stringify({ actorId, patch }),
    }),
  acceptPlanOwner: (roomId: string, actorId: string, itemId: string) =>
    request(`/api/rooms/${roomId}/plan/items/${itemId}/accept-owner`, {
      method: "POST",
      body: JSON.stringify({ actorId }),
    }),
  approvePlan: (roomId: string, actorId: string) =>
    request(`/api/rooms/${roomId}/plan/approve`, {
      method: "POST",
      body: JSON.stringify({ actorId }),
    }),
  generateHandoff: (roomId: string, actorId: string) =>
    request(`/api/rooms/${roomId}/handoff/generate`, {
      method: "POST",
      body: JSON.stringify({ actorId }),
    }),
  adrDetail: (roomId: string) => request(`/api/adrs/${roomId}`),
  planDetail: (roomId: string) => request(`/api/plans/${roomId}`),
  handoffDetail: (roomId: string) => request(`/api/handoff/${roomId}`),
};
