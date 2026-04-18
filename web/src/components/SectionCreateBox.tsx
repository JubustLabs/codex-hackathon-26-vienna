import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function SectionCreateBox({ actorId, onCreate }: { actorId: string; onCreate: (payload: any) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("business-processes");
  const [riskClass, setRiskClass] = useState("medium");
  const [initialMarkdown, setInitialMarkdown] = useState("");

  return (
    <div className="card">
      <h3>Create Section</h3>
      <Input placeholder="Section title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input placeholder="Topic (e.g. business-processes)" value={topic} onChange={(e) => setTopic(e.target.value)} />
      <select value={riskClass} onChange={(e) => setRiskClass(e.target.value)}>
        <option value="low">low risk</option>
        <option value="medium">medium risk</option>
        <option value="high">high risk</option>
      </select>
      <Textarea
        rows={5}
        placeholder="# Optional initial markdown"
        value={initialMarkdown}
        onChange={(e) => setInitialMarkdown(e.target.value)}
      />
      <Button
        onClick={() =>
          onCreate({
            actor_id: actorId,
            source_client: "web",
            title,
            topic,
            risk_class: riskClass,
            initial_markdown: initialMarkdown
          })
        }
      >
        Create Section (Become Owner)
      </Button>
    </div>
  );
}
