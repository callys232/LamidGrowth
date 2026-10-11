import { PageHeading } from '../../../shared/workspace/PageHeading';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';

type Profile = {
  name: string;
  email: string;
  role: string;
  bio: string;
  timezone: string;
  context: string;
};
type PayoutAccount = {
  id: string;
  provider: string;
  account_name: string;
  lastFour: string;
  ready: boolean;
};
type DeletionRequest = { id: string; status: string; createdAt: string; reviewNote?: string };
export function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ProfilePage() {
  const { refresh, notify } = useWorkspace();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api<Profile>('/account/profile')
      .then((p) => {
        if (active) setProfile(p);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    try {
      await api('/account/profile', data, 'PATCH');
      await refresh();
      notify('Profile saved.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="ACCOUNT · PROFILE"
        title="Profile"
        description="How you appear to your workspace and collaborators."
      />
      <section className="panel account-service">
        <h2>Your profile</h2>
        <p>Manage your identity and professional context.</p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {!profile && !error && <p role="status">Loading profile…</p>}
        {profile && (
          <form className="form-grid" onSubmit={save}>
            <Field label="Name">
              <input name="name" defaultValue={profile.name} required maxLength={100} />
            </Field>
            <Field label="Email">
              <input value={profile.email || ''} readOnly />
            </Field>
            <Field label="Professional role">
              <input name="role" defaultValue={profile.role || ''} maxLength={160} />
            </Field>
            <Field label="Time zone">
              <select name="timezone" defaultValue={profile.timezone || ''}>
                <option value="">Choose a time zone</option>
                {Intl.supportedValuesOf('timeZone').map((zone) => (
                  <option key={zone}>{zone}</option>
                ))}
              </select>
            </Field>
            <Field label="About you">
              <textarea name="bio" defaultValue={profile.bio || ''} maxLength={2000} rows={3} />
            </Field>
            <p>
              Account context: {profile.context}.{' '}
              <Link to="/os/talent">Edit skills, availability, and portfolio in Talent.</Link>
            </p>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        )}
      </section>
    </>
  );
}

export function PayoutSettingsPage() {
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [transfers, setTransfers] = useState<
    {
      id: string;
      amount_minor: number;
      currency: string;
      status: string;
      milestone_title: string;
      project_title: string;
    }[]
  >([]);
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [providers, setProviders] = useState<{ paystack: boolean; crypto_usdt: boolean } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function load() {
    const [a, p] = await Promise.all([
      api<PayoutAccount[]>('/payment-accounts'),
      api<{ paystack: boolean; crypto_usdt: boolean }>('/payment-providers'),
    ]);
    setAccounts(a);
    setProviders(p);
    setTransfers(await api<typeof transfers>('/payment-transfers'));
    if (p.paystack) setBanks(await api<{ name: string; code: string }[]>('/payment-banks'));
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError('');
    try {
      await api('/payment-accounts', { ...values, provider: 'paystack' });
      form.reset();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="MONEY · PAYOUTS"
        title="Payout accounts"
        description="Where released milestone payments are paid to you."
      />
      <section className="panel account-service">
        <h2>Payout accounts</h2>
        <p>Register your NGN bank account to receive eligible Paystack milestone payouts.</p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {!providers && !error && <p role="status">Loading payout options…</p>}
        <ul className="consultant-match-list">
          {accounts.map((a) => (
            <li key={a.id}>
              <strong>{a.account_name}</strong>
              <p>
                {a.provider} · ending {a.lastFour} ·{' '}
                {a.ready ? 'Ready for payouts' : 'Not activated'}
              </p>
            </li>
          ))}
        </ul>
        {providers?.paystack ? (
          <form className="form-grid" onSubmit={save}>
            <Field label="Account holder">
              <input name="accountName" required maxLength={200} autoComplete="name" />
            </Field>
            <Field label="Bank account number">
              <input
                name="accountNumber"
                required
                pattern="[0-9]{10}"
                inputMode="numeric"
                autoComplete="off"
              />
            </Field>
            <Field label="Bank">
              <select name="bankCode" required defaultValue="">
                <option value="">Choose your bank</option>
                {banks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit" disabled={busy}>
              {busy ? 'Registering…' : 'Register payout account'}
            </Button>
          </form>
        ) : (
          providers && <p>Bank payouts are unavailable until the payment provider is configured.</p>
        )}
        <p>USDT on TRON (TRC-20) is awaiting payment-provider setup.</p>
        <h3>Your payout history</h3>
        {!transfers.length && <p>No milestone payouts yet.</p>}
        <ul className="consultant-match-list">
          {transfers.map((transfer) => (
            <li key={transfer.id}>
              <strong>{transfer.milestone_title}</strong>
              <p>
                {transfer.project_title} · {(Number(transfer.amount_minor) / 100).toFixed(2)}{' '}
                {transfer.currency} · {transfer.status}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export function PrivacyPage() {
  const { state, notify } = useWorkspace();
  const [request, setRequest] = useState<DeletionRequest | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<DeletionRequest | null>('/account/deletion-request')
      .then(setRequest)
      .catch((e) => setError(e.message));
  }, []);
  async function exportData(workspace: boolean) {
    setBusy(true);
    setError('');
    try {
      downloadJson(
        await api(workspace ? '/export' : '/account/export'),
        workspace ? 'lamid-workspace.json' : 'lamid-personal-profile.json',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function requestDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError('');
    try {
      setRequest(await api<DeletionRequest>('/account/deletion-request', body));
      form.reset();
      notify('Deletion request submitted for review.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="ACCOUNT · PRIVACY & SECURITY"
        title="Privacy & security"
        description="Sign-in protection, your data, and account deletion."
      />
      <section className="panel account-service">
        <h2>Privacy & data controls</h2>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="account-service-grid">
          <section className="settings-card">
            <h3>Download your data</h3>
            <p>
              Personal export includes your identity, professional profile, credentials, bids,
              invitations, projects, masked payout accounts, and deletion requests.
            </p>
            <Button disabled={busy} onClick={() => void exportData(false)}>
              Download personal profile
            </Button>
            {state.permissions.includes('workspace:export') && (
              <>
                <p>
                  Workspace export includes goals, actions, reviews, knowledge, commercial records,
                  and workflow history.
                </p>
                <Button variant="secondary" disabled={busy} onClick={() => void exportData(true)}>
                  Download workspace data
                </Button>
              </>
            )}
          </section>
          <section className="settings-card">
            <h3>Control connected access</h3>
            <p>Review and revoke external sources and workflow permissions.</p>
            <Link to="/os/integrations">Manage integrations</Link>
            <br />
            <Link to="/os/settings/ai">Manage AI permissions</Link>
          </section>
        </div>
        <section className="settings-card">
          <h3>Request account deletion</h3>
          <p>
            Deletion requests require administrator review. Active projects, payments, and shared
            records must be reviewed before removal. Your account stays active while the request is
            pending.
          </p>
          {request && (
            <p role="status">
              Request status: <strong>{request.status.replaceAll('_', ' ')}</strong>
              {request.reviewNote && <> · {request.reviewNote}</>}
            </p>
          )}
          {!['pending', 'under_review'].includes(request?.status || '') && (
            <form className="form-grid" onSubmit={requestDeletion}>
              <Field label="Current password">
                <input type="password" name="password" autoComplete="current-password" required />
              </Field>
              <Field label="Reason (optional)">
                <textarea name="reason" maxLength={1000} />
              </Field>
              <Button type="submit" disabled={busy}>
                Submit deletion request
              </Button>
            </form>
          )}
        </section>
        <AccountSecurity />
      </section>
    </>
  );
}

function AccountSecurity() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [secret, setSecret] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ enabled: boolean }>('/mfa/status')
      .then((s) => setEnabled(s.enabled))
      .catch((e) => setError(e.message));
  }, []);
  async function enroll() {
    setBusy(true);
    setError('');
    try {
      const data = await api<{ secret: string }>('/mfa/enroll', {});
      setSecret(data.secret);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError('');
    try {
      if (enabled) {
        await api('/mfa/disable', body);
        setEnabled(false);
        setCodes([]);
      } else {
        const data = await api<{ recoveryCodes: string[] }>('/mfa/confirm', body);
        setCodes(data.recoveryCodes);
        setSecret('');
        setEnabled(true);
      }
      form.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-card">
      <h3>Account security</h3>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p>
        Two-factor authentication:{' '}
        {enabled === null ? 'Loading…' : enabled ? 'Enabled' : 'Not enabled'}
      </p>
      {enabled === false && !secret && (
        <Button disabled={busy} onClick={() => void enroll()}>
          Set up authentication
        </Button>
      )}
      {secret && (
        <p>
          Add this setup key to your authenticator app:{' '}
          <code className="account-secret">{secret}</code>
        </p>
      )}
      {(enabled || secret) && (
        <form className="form-grid" onSubmit={submit}>
          <Field label={enabled ? 'Current password' : 'Six-digit authentication code'}>
            <input
              name={enabled ? 'password' : 'code'}
              type={enabled ? 'password' : 'text'}
              required
              autoComplete={enabled ? 'current-password' : 'one-time-code'}
              pattern={enabled ? undefined : '[0-9]{6}'}
            />
          </Field>
          <Button variant="secondary" type="submit" disabled={busy}>
            {enabled ? 'Disable authentication' : 'Confirm authentication'}
          </Button>
        </form>
      )}
      {!!codes.length && (
        <>
          <p>Save these recovery codes. Each can be used once.</p>
          <pre className="account-secret">{codes.join('\n')}</pre>
        </>
      )}
    </section>
  );
}
