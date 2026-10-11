import {
  ArrowRight,
  Check,
  CreditCard,
  HelpCircle,
  KeyRound,
  Loader2,
  Mail,
  MessageSquareText,
  Sparkles,
} from 'lucide-react';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { api } from '../../../../api';
import { SUPPORT_EMAIL } from '../../../../shared/content/contact';
import './support-form.css';

const topics = [
  { value: 'Product use', icon: Sparkles },
  { value: 'Account access', icon: KeyRound },
  { value: 'Billing', icon: CreditCard },
  { value: 'Something else', icon: HelpCircle },
] as const;

const MESSAGE_MAX = 5000;
const MESSAGE_MIN = 10;

type Fields = { name: string; email: string; topic: string; message: string; website: string };
type Errors = Partial<Record<keyof Fields, string>>;
type Status =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'sent'; reference?: string }
  | { state: 'error'; message: string };

const empty: Fields = { name: '', email: '', topic: '', message: '', website: '' };

function validate(fields: Fields): Errors {
  const errors: Errors = {};
  if (!fields.name.trim()) errors.name = 'Tell us your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()))
    errors.email = 'Enter a valid email so we can reply.';
  if (!fields.topic) errors.topic = 'Choose the topic closest to your issue.';
  if (fields.message.trim().length < MESSAGE_MIN)
    errors.message = `Add a little more detail (at least ${MESSAGE_MIN} characters).`;
  return errors;
}

function Field({
  id,
  label,
  error,
  filled,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  filled: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`sf-field${filled ? ' is-filled' : ''}${error ? ' has-error' : ''}`}>
      <div className="sf-control">
        {children}
        <label htmlFor={id}>{label}</label>
      </div>
      {error && (
        <p className="sf-field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

/** /support — sends the visitor's message to the support inbox via POST /api/support. */
export function SupportForm() {
  const uid = useId();
  const [fields, setFields] = useState<Fields>(empty);
  const [touched, setTouched] = useState<Partial<Record<keyof Fields, boolean>>>({});
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const errors = validate(fields);
  const shown = (key: keyof Fields) => (touched[key] ? errors[key] : undefined);
  const set = (key: keyof Fields) => (value: string) =>
    setFields((current) => ({ ...current, [key]: value }));
  const blur = (key: keyof Fields) => () => setTouched((current) => ({ ...current, [key]: true }));
  const ids = {
    name: `${uid}-name`,
    email: `${uid}-email`,
    message: `${uid}-message`,
    topic: `${uid}-topic`,
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ name: true, email: true, topic: true, message: true });
    if (Object.keys(errors).length) {
      const first = (['name', 'email', 'topic', 'message'] as const).find((key) => errors[key]);
      document
        .querySelector<HTMLElement>(
          first === 'topic' ? `[name="topic"]` : `#${CSS.escape(ids[first!])}`,
        )
        ?.focus();
      return;
    }
    setStatus({ state: 'sending' });
    try {
      const result = await api<{ ok: true; reference?: string }>('/support', {
        ...fields,
        name: fields.name.trim(),
        email: fields.email.trim(),
        message: fields.message.trim(),
      });
      setFields(empty);
      setTouched({});
      setStatus({ state: 'sent', reference: result.reference });
    } catch (error) {
      setStatus({
        state: 'error',
        message:
          error instanceof Error
            ? error.message
            : `Your message couldn't be sent. Please email ${SUPPORT_EMAIL} directly.`,
      });
    }
  }

  const sending = status.state === 'sending';

  return (
    <section id="support-form" className="sf-wrap section-wrap">
      <div className="sf-card">
        <aside className="sf-aside">
          <span className="sf-eyebrow">
            <span aria-hidden="true" />
            Support
          </span>
          <h2>We’re here to help.</h2>
          <p>
            Send us a message and a member of the team will reply by email. The more context you
            share, the faster we can help.
          </p>
          <ul className="sf-tips">
            {[
              'What you were trying to do',
              'What happened instead',
              'Any error message you saw',
            ].map((tip) => (
              <li key={tip}>
                <Check size={15} aria-hidden="true" />
                {tip}
              </li>
            ))}
          </ul>
          <div className="sf-direct">
            <span>Prefer email?</span>
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              <Mail size={16} aria-hidden="true" />
              {SUPPORT_EMAIL}
            </a>
          </div>
        </aside>

        <div className="sf-main" aria-live="polite">
          {status.state === 'sent' ? (
            <div className="sf-done">
              <div className="sf-done-badge" aria-hidden="true">
                <Check size={30} strokeWidth={2.5} />
              </div>
              <h3>Message sent</h3>
              <p>
                Thanks — your message is with the support team. We’ll reply to the email you
                provided.
              </p>
              {status.reference && (
                <p className="sf-ref">
                  Reference <strong>{status.reference}</strong>
                </p>
              )}
              <button
                type="button"
                className="sf-link-button"
                onClick={() => setStatus({ state: 'idle' })}
              >
                Send another message
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <form className="sf-form" onSubmit={submit} noValidate>
              <div className="sf-row">
                <Field id={ids.name} label="Full name" error={shown('name')} filled={!!fields.name}>
                  <input
                    id={ids.name}
                    name="name"
                    autoComplete="name"
                    maxLength={120}
                    placeholder=" "
                    value={fields.name}
                    onChange={(e) => set('name')(e.target.value)}
                    onBlur={blur('name')}
                    aria-invalid={!!shown('name')}
                    aria-describedby={shown('name') ? `${ids.name}-error` : undefined}
                  />
                </Field>
                <Field
                  id={ids.email}
                  label="Email address"
                  error={shown('email')}
                  filled={!!fields.email}
                >
                  <input
                    id={ids.email}
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    placeholder=" "
                    value={fields.email}
                    onChange={(e) => set('email')(e.target.value)}
                    onBlur={blur('email')}
                    aria-invalid={!!shown('email')}
                    aria-describedby={shown('email') ? `${ids.email}-error` : undefined}
                  />
                </Field>
              </div>

              <fieldset
                className={`sf-topics${shown('topic') ? ' has-error' : ''}`}
                aria-describedby={shown('topic') ? `${ids.topic}-error` : undefined}
              >
                <legend>What do you need help with?</legend>
                <div className="sf-topic-row">
                  {topics.map(({ value, icon: Icon }) => (
                    <label
                      key={value}
                      className={`sf-topic${fields.topic === value ? ' is-active' : ''}`}
                    >
                      <input
                        type="radio"
                        name="topic"
                        value={value}
                        checked={fields.topic === value}
                        onChange={() => {
                          set('topic')(value);
                          blur('topic')();
                        }}
                      />
                      <Icon size={16} aria-hidden="true" />
                      {value}
                    </label>
                  ))}
                </div>
                {shown('topic') && (
                  <p className="sf-field-error" id={`${ids.topic}-error`}>
                    {shown('topic')}
                  </p>
                )}
              </fieldset>

              <Field
                id={ids.message}
                label="How can we help?"
                error={shown('message')}
                filled={!!fields.message}
              >
                <textarea
                  id={ids.message}
                  name="message"
                  rows={6}
                  maxLength={MESSAGE_MAX}
                  placeholder=" "
                  value={fields.message}
                  onChange={(e) => set('message')(e.target.value)}
                  onBlur={blur('message')}
                  aria-invalid={!!shown('message')}
                  aria-describedby={shown('message') ? `${ids.message}-error` : undefined}
                />
                <span className="sf-count" aria-hidden="true">
                  {fields.message.length.toLocaleString()} / {MESSAGE_MAX.toLocaleString()}
                </span>
              </Field>

              {/* Honeypot — invisible to people, tempting to bots. */}
              <div className="sf-trap" aria-hidden="true">
                <label>
                  Website
                  <input
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={fields.website}
                    onChange={(e) => set('website')(e.target.value)}
                  />
                </label>
              </div>

              {status.state === 'error' && (
                <p className="sf-alert" role="alert">
                  {status.message}
                </p>
              )}

              <div className="sf-actions">
                <button type="submit" className="sf-submit" disabled={sending}>
                  {sending ? (
                    <>
                      <Loader2 size={18} className="sf-spin" aria-hidden="true" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <MessageSquareText size={18} aria-hidden="true" />
                      Send message
                    </>
                  )}
                </button>
                <p className="sf-note">We only use your details to reply to this request.</p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
