import { ArrowRight, FileEdit } from 'lucide-react';
import { parseSpecialistDocument } from '../lib/parseSpecialistDocument';

/** Before/after comparison presentation — the one document tool that's inherently about a
 * delta, not a standalone document, so it gets its own two-column layout instead of reusing
 * DocumentCard: the original proposal (known client-side, no need to re-parse it out of the
 * response text) on the left, the requested change on the right. */
export function ChangeOrderCard({
  originalScope,
  originalAmount,
  currency,
  text,
}: {
  originalScope: string;
  originalAmount: number;
  currency: string;
  text: string;
}) {
  const doc = parseSpecialistDocument(text);
  const requested =
    doc.fields.find((f) => f.label.toLowerCase().includes('requested change'))?.value ||
    doc.paragraphs.join(' ');
  return (
    <div className="specialist-changeorder-card">
      <div className="specialist-document-kind">
        <FileEdit size={15} /> Change Order
      </div>
      <div className="specialist-changeorder-columns">
        <div className="specialist-changeorder-before">
          <h5>Original</h5>
          <p>{originalScope}</p>
          <p className="specialist-changeorder-amount">
            {originalAmount} {currency}
          </p>
        </div>
        <ArrowRight size={18} className="specialist-changeorder-arrow" />
        <div className="specialist-changeorder-after">
          <h5>Requested change</h5>
          <p>{requested}</p>
        </div>
      </div>
      {doc.note && <p className="specialist-document-note">{doc.note}</p>}
    </div>
  );
}
