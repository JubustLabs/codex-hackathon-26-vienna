import { Card } from "@/components/ui/card";

export function SectionContentView({ title, markdown }: { title: string; markdown: string }) {
  return (
    <Card>
      <h2>{title}</h2>
      <pre className="markdown-block">{markdown}</pre>
    </Card>
  );
}
