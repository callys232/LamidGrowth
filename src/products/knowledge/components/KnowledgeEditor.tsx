import { useState, type FormEvent } from 'react';
import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { Modal } from '../../../shared/ui/Modal';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
import type { KnowledgeItem } from '../types';
export function KnowledgeEditor({
  item,
  onClose,
  onSaved,
}: {
  item?: KnowledgeItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { state } = useWorkspace();
  const [content, setContent] = useState(item?.content || '');
  const [sourceName, setSourceName] = useState(item?.sourceName || '');
  const [sourceType, setSourceType] = useState(item?.sourceType || 'note');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api(
        item ? `/knowledge/${item.id}` : '/knowledge',
        {
          ...data,
          content,
          sourceType,
          sourceName,
          objectiveId: data.objectiveId || null,
          ...(item ? { version: item.version } : {}),
        },
        item ? 'PATCH' : 'POST',
      );
      onSaved();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={item ? 'Review knowledge' : 'Add workspace knowledge'} onClose={onClose} wide>
      <form onSubmit={save}>
        <Field label="Knowledge title">
          <input name="title" required maxLength={200} defaultValue={item?.title} />
        </Field>
        <Field label="Import plain text (optional)">
          <input
            type="file"
            accept=".txt,.md,.csv,text/plain,text/markdown,text/csv"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (!/\.(txt|md|csv)$/i.test(file.name) || file.size > 20000) {
                setError('Choose a TXT, MD, or CSV file no larger than 20 KB.');
                return;
              }
              try {
                const text = await file.text();
                if (text.includes('\u0000') || text.includes('\ufffd'))
                  throw new Error('Use a UTF-8 text file.');
                setContent(text);
                setSourceName(file.name);
                setSourceType('text-file');
                setError('');
              } catch (error) {
                setError((error as Error).message);
              }
            }}
          />
        </Field>
        <Field label="Knowledge content">
          <textarea
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            maxLength={20000}
          />
        </Field>
        <Field label="Connected objective">
          <select name="objectiveId" defaultValue={item?.objectiveId || ''}>
            <option value="">Workspace context</option>
            {state.objectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Classification">
          <select name="classification" defaultValue={item?.classification || 'workspace'}>
            <option value="workspace">Workspace</option>
            <option value="confidential">Confidential</option>
          </select>
        </Field>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <Button type="submit" disabled={busy}>
            Save knowledge
          </Button>
          {item && (
            <Button variant="secondary" disabled={busy} onClick={() => setDeleting(true)}>
              Delete knowledge
            </Button>
          )}
        </div>
        {deleting && item && (
          <div role="alert">
            <p>
              Delete this knowledge record? Its text will be removed. The activity trail retains the
              record ID.
            </p>
            <Button
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void api(`/knowledge/${item.id}`, { version: item.version }, 'DELETE')
                  .then(onSaved)
                  .catch((error: Error) => setError(error.message))
                  .finally(() => setBusy(false));
              }}
            >
              Confirm deletion
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
}
