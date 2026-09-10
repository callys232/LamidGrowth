import { Link } from 'react-router-dom';
import type { useIntelligencePage } from '../hooks/useIntelligencePage';

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
      {!policy?.configured && (
        <section className="panel settings-card">
          <h2>AI provider not configured</h2>
          <p>
            Your server operator can connect an AI provider.{' '}
            <Link to="/os/companion">Guided planning</Link> remains available.
          </p>
        </section>
      )}
      {policy?.configured && (
        <p>
          Provider: {policy.provider} · Model: {policy.model} ·{' '}
          {policy.enabled ? 'Enabled' : 'Disabled'} · Limit: {policy.dailyLimit} requests per day
        </p>
      )}
      {policy && !policy.accountEligible && (
        <p>
          External AI reviews require a verified account.{' '}
          <Link to="/verify">Verify your account</Link>.
        </p>
      )}
    </>
  );
}
