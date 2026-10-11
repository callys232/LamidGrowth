import { BadgeCheck, Cpu, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusPill } from '../../../shared/workspace/ui/StatusPill';
import type { useIntelligencePage } from '../hooks/useIntelligencePage';

/** The workspace's AI provider, model, switch and daily limit as one status card. */
export function IntelligenceProviderStatusSlide({
  error,
  policy,
}: Pick<ReturnType<typeof useIntelligencePage>, 'error' | 'policy'>) {
  return (
    <>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {policy && (
        <section
          className="ws-panel ws-ai-status"
          data-domain="intelligence"
          aria-labelledby="ai-status-title"
        >
          <div className="ws-panel-heading">
            <div>
              <h2 id="ai-status-title">AI provider</h2>
              <span>
                {policy.configured
                  ? 'What reviews and assistance run on in this workspace.'
                  : 'Your server operator can connect an AI provider. Guided planning works without one.'}
              </span>
            </div>
            <StatusPill tone={policy.configured && policy.enabled ? 'money' : 'neutral'}>
              {!policy.configured ? 'Not configured' : policy.enabled ? 'Enabled' : 'Disabled'}
            </StatusPill>
          </div>
          <dl className="ws-ai-facts">
            <div>
              <dt>
                <Cpu size={14} aria-hidden="true" /> Provider
              </dt>
              <dd>{policy.provider || 'Not set'}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{policy.model || 'Not set'}</dd>
            </div>
            <div>
              <dt>Daily limit</dt>
              <dd>
                {policy.dailyLimit} {policy.dailyLimit === 1 ? 'request' : 'requests'}
              </dd>
            </div>
            <div>
              <dt>Review cost</dt>
              <dd>{policy.reviewCost} points</dd>
            </div>
          </dl>
          {!policy.configured && (
            <p className="ws-ai-note">
              <Link to="/os/companion">Open guided planning</Link> — it needs no AI provider.
            </p>
          )}
          {!policy.accountEligible ? (
            <p className="ws-ai-note" data-tone="warn">
              <ShieldAlert size={16} aria-hidden="true" /> External AI reviews require a verified
              account. <Link to="/verify">Verify your account</Link>.
            </p>
          ) : (
            <p className="ws-ai-note">
              <BadgeCheck size={16} aria-hidden="true" /> Your account is verified for external AI
              reviews.
            </p>
          )}
        </section>
      )}
    </>
  );
}
