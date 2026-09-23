import { useEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { Bot, Minus, X } from 'lucide-react';
import { api } from '../../../api';
import { CompanionChatPage } from '../pages/CompanionChatPage';
import './companionWidget.css';

type GuideTopic =
  | 'onboarding'
  | 'support'
  | 'pricing'
  | 'opportunities'
  | 'clarity'
  | 'capability'
  | 'consistency'
  | 'companion'
  | 'workflows';
type GuideReply = { topic: GuideTopic; name: string; response: string; href: string };
type Turn = { role: 'user' | 'agent'; text: string; href?: string; at: string };

// Example questions, not topic labels — clicking one sends it exactly as if typed, so a new
// visitor has something to click without the widget ever presenting itself as a set of separate
// bots to pick between.
const PROMPTS = ['How do I get started?', "What's this going to cost me?", "I can't sign in"];

const PROACTIVE_DELAY_MS = 26_000;
const SESSION_KEY = 'lamid-companion-offered';

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function CompanionWidget() {
  const { pathname } = useLocation();
  const workspace = pathname === '/os' || pathname.startsWith('/os/');
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [proactive, setProactive] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [lastTopic, setLastTopic] = useState<GuideTopic | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const reduced = useReducedMotion();

  // The trigger button unmounts while the panel is open (AnimatePresence), so a ref captured
  // before opening is stale by the time we close — wait for the trigger to remount, then focus it.
  useEffect(() => {
    if (!open && returnFocus.current) {
      returnFocus.current = false;
      trigger.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setOpen(false);
    setMinimized(false);
    setTurns([]);
    setLastTopic(undefined);
    setError('');
  }, [pathname]);

  // Proactive open — public pages only (a signed-in workspace member already has the specialist
  // chat one click away, and a stacked auto-open there would just be a second thing demanding
  // attention on top of the workspace itself). Once per browser session, and a manual close is
  // remembered for the rest of it so dismissing it once does not mean it reopens on navigation.
  useEffect(() => {
    if (workspace) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const timer = window.setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, '1');
      setProactive(true);
      setOpen(true);
    }, PROACTIVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [workspace]);

  useEffect(() => {
    if (!open || minimized) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        returnFocus.current = true;
        setOpen(false);
        setMinimized(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, minimized]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError('');
    setTurns((prev) => [...prev, { role: 'user', text: trimmed, at: timestamp() }]);
    setMessage('');
    setBusy(true);
    try {
      const reply = await api<GuideReply>('/companion/guide', {
        message: trimmed,
        previousTopic: lastTopic,
      });
      setLastTopic(reply.topic);
      setTurns((prev) => [
        ...prev,
        { role: 'agent', text: reply.response, href: reply.href, at: timestamp() },
      ]);
    } catch (e) {
      setError((e as Error).message);
      setTurns((prev) => [
        ...prev,
        { role: 'agent', text: 'Could not reach guidance. Try again shortly.', at: timestamp() },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (pathname === '/os/companion/chat') return null;

  return (
    <div className="companion-widget">
      <AnimatePresence>
        {!open && (
          <m.button
            key="trigger"
            ref={trigger}
            className="companion-widget-trigger"
            initial={reduced ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduced ? undefined : { scale: 0, opacity: 0 }}
            whileHover={reduced ? undefined : { scale: 1.08 }}
            whileTap={reduced ? undefined : { scale: 0.92 }}
            onClick={() => {
              setOpen(true);
              setMinimized(false);
            }}
            aria-haspopup="dialog"
            aria-label="Ask Companion"
          >
            <Bot size={24} strokeWidth={2} aria-hidden="true" />
          </m.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && !minimized && (
          <m.div
            key="panel"
            className="companion-widget-panel"
            role="dialog"
            aria-modal="false"
            aria-labelledby="companion-widget-title"
            initial={reduced ? false : { opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.33, 1, 0.68, 1] }}
          >
            <header className="companion-widget-header">
              <div className="companion-widget-badge">
                <Bot size={16} strokeWidth={2.25} aria-hidden="true" />
              </div>
              <div className="companion-widget-heading">
                <p id="companion-widget-title">Your Companion</p>
                <p className="companion-widget-subtext">
                  {workspace
                    ? 'Specialists on call'
                    : proactive
                      ? 'Still deciding, or looking for something specific?'
                      : 'Ask anything, get pointed the right way'}
                </p>
              </div>
              <div className="companion-widget-actions">
                <button
                  type="button"
                  onClick={() => setMinimized(true)}
                  aria-label="Minimize Companion"
                  title="Minimize"
                >
                  <Minus size={15} strokeWidth={2.25} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    returnFocus.current = true;
                    setOpen(false);
                    setMinimized(false);
                  }}
                  aria-label="Close Companion"
                  title="Close"
                >
                  <X size={15} strokeWidth={2.25} aria-hidden="true" />
                </button>
              </div>
            </header>
            <div className="companion-widget-body">
              {workspace ? (
                <CompanionChatPage key={pathname} />
              ) : (
                <>
                  <ol className="companion-chat-turns" aria-live="polite">
                    {turns.length === 0 && (
                      <li className="companion-chat-turn companion-chat-turn-agent">
                        <span className="companion-chat-avatar" aria-hidden="true">
                          <Bot size={13} strokeWidth={2.25} />
                        </span>
                        <div className="companion-chat-bubble">
                          <p>
                            {proactive
                              ? 'Still deciding, or looking for something specific?'
                              : '👋 Hello! Ask anything to get started.'}
                          </p>
                        </div>
                      </li>
                    )}
                    {turns.map((turn, index) => (
                      <li
                        key={index}
                        className={`companion-chat-turn companion-chat-turn-${turn.role}`}
                      >
                        {turn.role === 'agent' && (
                          <span className="companion-chat-avatar" aria-hidden="true">
                            <Bot size={13} strokeWidth={2.25} />
                          </span>
                        )}
                        <div className="companion-chat-bubble">
                          <p>{turn.text}</p>
                          {turn.href && (
                            <Link to={turn.href} onClick={() => setOpen(false)}>
                              Open this page
                            </Link>
                          )}
                          <span className="companion-chat-time">{turn.at}</span>
                        </div>
                      </li>
                    ))}
                    {busy && (
                      <li className="companion-chat-turn companion-chat-turn-agent companion-chat-pending">
                        <span className="companion-chat-avatar" aria-hidden="true">
                          <Bot size={13} strokeWidth={2.25} />
                        </span>
                        <div className="companion-chat-bubble">
                          <span className="companion-chat-dots" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                          </span>
                          <span className="sr-only">Thinking…</span>
                        </div>
                      </li>
                    )}
                  </ol>
                  {turns.length === 0 && (
                    <div className="companion-chat-quick-pick">
                      {PROMPTS.map((prompt) => (
                        <button key={prompt} type="button" onClick={() => void send(prompt)}>
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                  {error && (
                    <p className="companion-chat-error" role="alert">
                      {error}
                    </p>
                  )}
                  <form
                    className="companion-chat-composer companion-widget-composer"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void send(message);
                    }}
                  >
                    <label className="sr-only" htmlFor="companion-widget-input">
                      Ask Companion
                    </label>
                    <input
                      id="companion-widget-input"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Ask anything about LAMID ONE…"
                      maxLength={500}
                      disabled={busy}
                    />
                    <button type="submit" disabled={busy || !message.trim()} aria-label="Send">
                      Send
                    </button>
                  </form>
                </>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && minimized && (
          <m.button
            key="minimized"
            className="companion-widget-minimized"
            initial={reduced ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            exit={reduced ? undefined : { scale: 0 }}
            whileHover={reduced ? undefined : { scale: 1.06 }}
            onClick={() => setMinimized(false)}
            aria-label="Restore Companion"
          >
            <Bot size={20} strokeWidth={2} aria-hidden="true" />
          </m.button>
        )}
      </AnimatePresence>
    </div>
  );
}
