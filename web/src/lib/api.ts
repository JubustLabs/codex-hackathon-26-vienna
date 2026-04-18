import type { Section, Principal } from "./types";

const API_KEY = localStorage.getItem("demo_api_key") || "demo-shared-key";

async function req<T>(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      ...(opts.headers || {})
    }
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export const api = {
  health: () => req<{ ok: boolean }>("/api/health"),
  sections: () => req<Section[]>("/api/sections"),
  section: (id: string) => req<Section>(`/api/sections/${id}`),
  revisions: (id: string) => req<any[]>(`/api/sections/${id}/revisions`),
  principals: () => req<Principal[]>("/api/principals"),
  events: () => req<any[]>("/api/events"),
  createSection: (payload: any) => req("/api/sections", { method: "POST", body: JSON.stringify(payload) }),
  createProposal: (payload: any) => req("/api/proposals", { method: "POST", body: JSON.stringify(payload) }),
  agentChat: (payload: any) =>
    req<{ reply: string; suggestions: string[]; fallback_reason?: string | null }>("/api/agent/chat", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  reviewProposal: (proposalId: string, payload: any) =>
    req(`/api/proposals/${proposalId}/reviews`, { method: "POST", body: JSON.stringify(payload) }),
  requestChanges: (proposalId: string, payload: any) =>
    req(`/api/proposals/${proposalId}/request-changes`, { method: "POST", body: JSON.stringify(payload) }),
  resolveConflict: (proposalId: string, payload: any) =>
    req(`/api/proposals/${proposalId}/resolve-conflict`, { method: "POST", body: JSON.stringify(payload) }),
  ownerQuickEdit: (sectionId: string, payload: any) =>
    req(`/api/sections/${sectionId}/owner-quick-edit`, { method: "POST", body: JSON.stringify(payload) }),
  rollback: (sectionId: string, payload: any) =>
    req(`/api/sections/${sectionId}/rollback`, { method: "POST", body: JSON.stringify(payload) }),
  setReviewers: (sectionId: string, payload: any) =>
    req(`/api/sections/${sectionId}/reviewers`, { method: "PUT", body: JSON.stringify(payload) })
};
