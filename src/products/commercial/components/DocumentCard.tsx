import type { LucideIcon } from 'lucide-react';
import { parseSpecialistDocument } from '../lib/parseSpecialistDocument';

/** Formal-document presentation: a serif heading, labeled fields as rows, and prose as
 * paragraphs — used for Scope of Work, Statement of Work, and Client Brief, which are all
 * "read this like a real document" tools, distinct from a checklist or a before/after diff. */
export function DocumentCard({
  icon: Icon,
  kind,
  text,
  runId,
}: {
  icon: LucideIcon;
  kind: string;
  text: string;
  runId?: string;
}) {
  const doc = parseSpecialistDocument(text);
  return (
    <div className="specialist-document-card">
      <div className="specialist-document-kind">
        <Icon size={15} /> {kind}
      </div>
      <h4 className="specialist-document-heading">{doc.heading}</h4>
      {doc.fields.length > 0 && (
        <dl className="specialist-document-fields">
          {doc.fields.map((field, i) => (
            <div key={i} className="specialist-document-field">
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {doc.paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {doc.note && <p className="specialist-document-note">{doc.note}</p>}
      {runId && (
        <a
          className="button button-secondary"
          href={`/api/agent-runs/${runId}/pdf`}
          target="_blank"
          rel="noreferrer"
        >
          Download PDF
        </a>
      )}
    </div>
  );
}
