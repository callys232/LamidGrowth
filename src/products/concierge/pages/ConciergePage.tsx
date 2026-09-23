import { Button } from '../../../shared/ui/Button';
import { Empty } from '../../../shared/ui/Empty';
import { Field } from '../../../shared/ui/Field';
import { useConciergePage } from '../hooks/useConciergePage';

const statusLabel: Record<string, string> = {
  pending: 'Pending review',
  approved: 'Approved — you can be assigned to workspaces',
  rejected: 'Not approved',
};

/** /os/concierge — become a provider, bring one in, and view the billing statement. */
export function ConciergePage() {
  const page = useConciergePage();

  return (
    <section className="concierge-page">
      <header>
        <h1>Concierge</h1>
        <p>
          A dedicated PM assigned to run projects and tasks on your behalf, or apply to become one.
        </p>
      </header>

      {page.error && (
        <p className="form-error" role="alert">
          {page.error}
        </p>
      )}

      <section className="panel settings-card">
        <h2>Become a concierge provider</h2>
        {page.myApplication ? (
          <p>
            <strong>{page.myApplication.headline}</strong> —{' '}
            {statusLabel[page.myApplication.status]}
          </p>
        ) : (
          <form onSubmit={page.apply}>
            <Field label="Headline" hint="e.g. Senior PM, 8 years managing delivery teams">
              <input name="headline" required maxLength={200} />
            </Field>
            <Field label="Experience">
              <textarea name="experience" rows={3} maxLength={5000} />
            </Field>
            <Field
              label="Your monthly rate (USD)"
              hint="Charged to the client for as long as you're assigned"
            >
              <input name="monthlyRate" type="number" min={0} step="0.01" />
            </Field>
            <Button type="submit" disabled={page.busy}>
              Submit application
            </Button>
          </form>
        )}
      </section>

      {page.canAssign && (
        <section className="panel settings-card">
          <h2>Bring in a concierge</h2>
          <p>
            A one-time ecosystem fee applies at assignment, plus the provider's own recurring rate.
          </p>
          {page.providers.length === 0 ? (
            <Empty title="No approved providers yet">Check back once providers are approved.</Empty>
          ) : (
            page.providers.map((provider) => (
              <div className="audit-event" key={provider.id}>
                <div>
                  <strong>{provider.name}</strong>
                  <p>
                    {provider.headline}
                    {provider.monthlyRateMinor > 0 &&
                      ` · $${(provider.monthlyRateMinor / 100).toFixed(2)}/mo`}
                  </p>
                </div>
                <Button disabled={page.busy} onClick={() => void page.assign(provider.id)}>
                  Assign
                </Button>
              </div>
            ))
          )}
        </section>
      )}

      {page.canViewBilling && (
        <section className="panel settings-card">
          <h2>Billing statement</h2>
          {!page.statement || page.statement.lineItems.length === 0 ? (
            <Empty title="No charges yet">Nothing on your statement.</Empty>
          ) : (
            <>
              {page.statement.lineItems.map((item) => (
                <div className="audit-event" key={item.id}>
                  <div>
                    <strong>{item.description}</strong>
                    <p>{item.kind}</p>
                  </div>
                  <span>${(item.amount_minor / 100).toFixed(2)}</span>
                </div>
              ))}
              <p>
                <strong>Total: ${(page.statement.totalMinor / 100).toFixed(2)}</strong>
              </p>
            </>
          )}
          {page.statement && (
            <p>
              <small>
                Points used: {page.statement.pointsUsage.totalPointsSpent} (≈ $
                {(page.statement.pointsUsage.estimatedCostMinor / 100).toFixed(2)}).{' '}
                {page.statement.pointsUsage.note}
              </small>
            </p>
          )}
        </section>
      )}
    </section>
  );
}
