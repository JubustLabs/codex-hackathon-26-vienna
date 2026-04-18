import type { Section } from "@/lib/types";

export function SectionTreeNav({
  sections,
  activeSectionId,
  onSelect
}: {
  sections: Section[];
  activeSectionId?: string;
  onSelect: (sectionId: string) => void;
}) {
  return (
    <div>
      <h3>Sections</h3>
      <div className="list">
        {sections.map((s) => (
          <button
            key={s.id}
            className={`list-item ${activeSectionId === s.id ? "active" : ""}`}
            onClick={() => onSelect(s.id)}
          >
            <div>{s.title}</div>
            <small>{s.path}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
