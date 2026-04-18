import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { api } from "@/lib/api";
import {
  buildAdrMarkdown,
  firstFilledLine,
  labelDecisionSection,
  splitDecisionText,
} from "@/lib/decision-language";
import { participantKey, withParticipant } from "@/lib/room-navigation";

export function AdrDetailPage() {
  const { roomId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const [adr, setAdr] = useState<any>(null);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const participantId =
    searchParams.get("participantId") ??
    window.localStorage.getItem(participantKey(roomId)) ??
    undefined;

  useEffect(() => {
    void api.adrDetail(roomId).then(setAdr);
  }, [roomId]);

  if (!adr) {
    return <section className="single-column-page">Loading shared decision…</section>;
  }

  const highlights = [
    {
      label: "Chosen path",
      value: firstFilledLine(adr.sections.decision) || "No final choice yet",
    },
    {
      label: "Tradeoff",
      value: firstFilledLine(adr.sections.tradeoffs) || "No tradeoff captured yet",
    },
    {
      label: "What happens next",
      value:
        firstFilledLine(adr.sections.consequences, adr.sections.implementation_guidance) ||
        "No next step captured yet",
    },
  ];

  const markdown = buildAdrMarkdown(adr);

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const downloadMarkdown = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shared-decision-${roomId}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="single-column-page">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Shared decision record</p>
            <h1>Review the choice after the fact</h1>
          </div>
          <div className="row-actions">
            <span className="status-chip" data-status={adr.status}>
              {String(adr.status).replaceAll("_", " ")}
            </span>
            <button
              type="button"
              className="button"
              onClick={() => setShowMarkdown((prev) => !prev)}
            >
              {showMarkdown ? "Hide markdown" : "View markdown"}
            </button>
            <Link
              className="button ghost"
              to={withParticipant(`/rooms/${roomId}`, participantId)}
            >
              ← Back to room
            </Link>
          </div>
        </div>
        <div className="summary-strip">
          {highlights.map((item) => (
            <article className="summary-card" key={item.label}>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
        {showMarkdown ? (
          <article className="list-card markdown-preview">
            <div className="row-actions" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="button" onClick={copyMarkdown}>
                {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" className="button" onClick={downloadMarkdown}>
                Download .md
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                padding: "0.9rem 1rem",
                background: "rgba(23,71,157,0.04)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                fontFamily: "var(--mono)",
                fontSize: "0.85rem",
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: "60vh",
                overflow: "auto",
              }}
            >
              {markdown}
            </pre>
          </article>
        ) : null}
        {Object.entries(adr.sections).map(([key, value]) => (
          <article className="list-card" key={key}>
            <strong>{labelDecisionSection(key)}</strong>
            <span>{splitDecisionText(String(value)).join(" · ") || "Empty"}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
