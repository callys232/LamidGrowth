import { CheckSquare, type LucideIcon } from 'lucide-react';
import { parseSpecialistDocument } from '../lib/parseSpecialistDocument';

/** Splits prose into individual checklist-worthy items: real bullet/numbered lines if the text
 * already has them (what a real AI response tends to produce), otherwise a best-effort split of
 * a single recorded-deliverables sentence on commas/semicolons/periods (what the deterministic,
 * no-AI-configured template produces) — never worse than one item, the whole sentence. */
function splitIntoItems(paragraphs: string[]): string[] {
  const joined = paragraphs.join(' ');
  const bulletLines = paragraphs.filter((p) => /^[-*•]|^\d+[.)]/.test(p.trim()));
  if (bulletLines.length > 1) return bulletLines.map((line) => line.replace(/^[-*•]\s*|^\d+[.)]\s*/, '').trim());
  const bySeparator = joined
    .split(/[,;]|(?<=\.)\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
  return bySeparator.length > 1 ? bySeparator : [joined];
}

/** Checklist presentation: every item as a real checkbox row — used for Deliverable Builder and
 * Acceptance Criteria Builder, matching how a real project-management or QA tool would show
 * these, rather than a document to read top to bottom. */
export function ChecklistCard({
  icon: Icon = CheckSquare,
  kind,
  text,
  runId,
}: {
  icon?: LucideIcon;
  kind: string;
  text: string;
  runId?: string;
}) {
  const doc = parseSpecialistDocument(text);
  const items = splitIntoItems([...doc.fields.map((f) => `${f.label}: ${f.value}`), ...doc.paragraphs]);
  return (
    <div className="specialist-checklist-card">
      <div className="specialist-document-kind">
        <Icon size={15} /> {kind}
      </div>
      <h4 className="specialist-document-heading">{doc.heading}</h4>
      <ul className="specialist-checklist-items">
        {items.map((item, i) => (
          <li key={i}>
            <CheckSquare size={14} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {doc.note && <p className="specialist-document-note">{doc.note}</p>}
      {runId && (
        <a className="button button-secondary" href={`/api/agent-runs/${runId}/pdf`} target="_blank" rel="noreferrer">
          Download PDF
        </a>
      )}
    </div>
  );
}
