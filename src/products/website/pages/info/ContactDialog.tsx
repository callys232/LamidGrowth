import { useEffect, useRef, useState, type FormEvent } from 'react';
import { networkApi } from '../../../../api';
import './contact-dialog.css';

const topics = ['Product question', 'Pricing', 'Expert help', 'Enterprise', 'Complaint', 'Other'];

/** Pop-up form that sends an inquiry or complaint to the team inbox. */
export function ContactDialog({
  open,
  topic,
  onClose,
}: {
  open: boolean;
  topic?: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await networkApi('/contact', {
        name: data.get('name'),
        email: data.get('email'),
        topic: data.get('topic'),
        message: data.get('message'),
        company: data.get('company') || undefined,
      });
      setSent(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Please try again, or email hp@lamidconsulting.com.',
      );
    } finally {
      setBusy(false);
    }
  }

  function close() {
    onClose();
    setSent(false);
    setError('');
  }

  return (
    <dialog ref={ref} className="cd" aria-labelledby="cd-title" onClose={close}>
      <button type="button" className="cd-x" aria-label="Close" onClick={close}>
        ×
      </button>
      {sent ? (
        <div className="cd-done" role="status">
          <h2 id="cd-title">Thank you. We have your message.</h2>
          <p>We will reply to the email you gave us.</p>
          <button type="button" className="cd-send" onClick={close}>
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <h2 id="cd-title">Tell us the outcome</h2>
          <p className="cd-lede">
            Describe what you are trying to achieve and the context that matters.
          </p>
          <label>
            Your name
            <input name="name" required maxLength={100} autoComplete="name" />
          </label>
          <label>
            Email
            <input name="email" type="email" required maxLength={254} autoComplete="email" />
          </label>
          <label>
            Topic
            <select name="topic" defaultValue={topic && topics.includes(topic) ? topic : 'Other'}>
              {topics.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Message
            <textarea name="message" required minLength={10} maxLength={4000} rows={5} />
          </label>
          <label className="cd-hp" aria-hidden="true">
            Company
            <input name="company" tabIndex={-1} autoComplete="off" />
          </label>
          {error && (
            <p className="cd-error" role="alert">
              {error}
            </p>
          )}
          <button className="cd-send" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send inquiry'}
          </button>
        </form>
      )}
    </dialog>
  );
}
