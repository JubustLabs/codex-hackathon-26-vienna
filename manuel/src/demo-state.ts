import type { RoomState } from "./types";

export const initialRoomState: RoomState = {
  roomId: "customer-service-agent",
  topic: "How should we build our customer service agent?",
  decisionToMake:
    "Choose the first architecture for a local-first customer service agent that can answer common questions, escalate correctly, and fit our current stack.",
  whyNow: "Implementation starts after this session and the team needs one credible architecture direction.",
  currentBlocker:
    "Should the customer service agent answer directly by default, or escalate earlier for trust and control?",
  phase: "exploring",
  participants: {
    maya: {
      id: "maya",
      name: "Maya",
      role: "Support Lead",
      laneTitle: "Operator trust + policy",
      connected: true,
      pluginConnected: false,
      evidence: [
        {
          label: "Support note",
          text: "Customers lose trust when the agent sounds confident but is wrong.",
          emphasis: true
        },
        {
          label: "Policy fragment",
          text: "Escalate billing, refunds, and account access issues early."
        },
        {
          label: "Ticket pattern",
          text: "Top complaints: delivery status, returns, account lockouts."
        }
      ],
      suggestions: [
        {
          id: "maya-suggest-1",
          type: "constraint",
          text: "Escalate high-risk topics earlier to protect trust and policy compliance.",
          source: "maya-plugin",
          confidence: 0.9
        }
      ],
      published: [],
      packets: []
    },
    alex: {
      id: "alex",
      name: "Alex",
      role: "Engineering Lead",
      laneTitle: "Reuse + shipping speed",
      connected: true,
      pluginConnected: false,
      evidence: [
        {
          label: "Stack note",
          text: "We already have docs search and auth services we can reuse.",
          emphasis: true
        },
        {
          label: "Implementation note",
          text: "A workflow-driven escalation layer is easier to ship safely than a fully autonomous agent."
        },
        {
          label: "Constraint",
          text: "MVP should be local-first, simple, and fit the current stack."
        }
      ],
      suggestions: [
        {
          id: "alex-suggest-1",
          type: "option",
          text: "Answer common support questions directly with retrieval before escalating.",
          source: "alex-plugin",
          confidence: 0.86
        }
      ],
      published: [],
      packets: []
    }
  },
  synthesisTitle: "Seeded room ready",
  synthesisBody:
    "The room is loaded with one clear disagreement: Maya wants earlier escalation for trust and control, while Alex wants direct answers where retrieval looks safe.",
  whatWereDeciding: [
    "Choose the first customer service agent architecture.",
    "Keep the MVP local-first and aligned with the current stack."
  ],
  whatStillConflicts: [
    "How much autonomy should the agent have before human handoff?",
    "Where should confidence thresholds force escalation?"
  ],
  commonGround: [
    "The agent should reuse existing docs/search/auth pieces.",
    "High-risk support topics need explicit rules."
  ],
  decision: null,
  tradeoffs: [],
  plan: [],
  breadcrumbs: []
};
