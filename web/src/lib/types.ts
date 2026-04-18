export type Principal = {
  id: string;
  display_name: string;
  role: string;
};

export type Proposal = {
  id: string;
  section_id: string;
  base_revision_id: string;
  proposed_patch: string;
  summary: string;
  rationale: string | null;
  source_type: string;
  source_actor_id: string;
  source_client: string;
  status: string;
  orchestrator_score: number;
  ambiguity_flags: string[];
  review_summary: string;
  conflict_explanation: string;
  created_at: string;
  updated_at: string;
};

export type Section = {
  id: string;
  path: string;
  title: string;
  topic: string;
  content_markdown: string;
  risk_class: string;
  primary_owner_id: string;
  published_revision_id: string;
  proposals?: Proposal[];
  reviewers?: { principal_id: string; display_name: string }[];
};
