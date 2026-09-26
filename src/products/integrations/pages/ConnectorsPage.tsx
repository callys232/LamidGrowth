import { useCallback, useEffect, useState } from 'react';
import { Plug, Trash2 } from 'lucide-react';
import { api } from '../../../api';
import { Empty } from '../../../shared/ui/Empty';
import { StatusPill } from '../../../shared/workspace/StatusPill';

type Grant = {
  id: string;
  connector_id: string;
  scope: string;
  granted_by: string;
  granted_at: string;
  revoked_at: string | null;
};
type Connector = {
  id: string;
  name: string;
  type: 'webhook' | 'manual';
  status: 'connected' | 'disconnected' | 'error';
  hasSecret: boolean;
  last_sync_at: string | null;
  created_at: string;
  secret?: string; // present only in the create response, exactly once
};

function useConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [grantsByConnector, setGrantsByConnector] = useState<Record<string, Grant[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'webhook' | 'manual'>('webhook');
  const [busy, setBusy] = useState(false);
  const [newSecret, setNewSecret] = useState<{ connectorId: string; secret: string } | null>(null);
  const [scopeDrafts, setScopeDrafts] = useState<Record<string, string>>({});

  const loadGrants = useCallback(async (connectorId: string) => {
    const grants = await api<Grant[]>(`/connectors/${connectorId}/grants`, undefined, 'GET');
    setGrantsByConnector((prev) => ({ ...prev, [connectorId]: grants }));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    api<Connector[]>('/connectors', undefined, 'GET')
      .then(async (items) => {
        setConnectors(items);
        setError('');
        await Promise.all(items.map((c) => loadGrants(c.id)));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadGrants]);
  useEffect(() => load(), [load]);

  const create = useCallback(async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const created = await api<Connector>('/connectors', { name, type });
      setName('');
      if (created.secret) setNewSecret({ connectorId: created.id, secret: created.secret });
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [name, type, load]);

  const remove = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        await api(`/connectors/${id}`, {}, 'DELETE');
        load();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const addGrant = useCallback(
    async (connectorId: string) => {
      const scope = (scopeDrafts[connectorId] || '').trim();
      if (!scope) return;
      setBusy(true);
      try {
        await api(`/connectors/${connectorId}/grants`, { scope });
        setScopeDrafts((prev) => ({ ...prev, [connectorId]: '' }));
        await loadGrants(connectorId);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [scopeDrafts, loadGrants],
  );

  const revokeGrant = useCallback(
    async (connectorId: string, grantId: string) => {
      setBusy(true);
      try {
        await api(`/connectors/${connectorId}/grants/${grantId}`, {}, 'DELETE');
        await loadGrants(connectorId);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [loadGrants],
  );

  return {
    connectors,
    grantsByConnector,
    loading,
    error,
    name,
    setName,
    type,
    setType,
    create,
    busy,
    remove,
    newSecret,
    dismissSecret: () => setNewSecret(null),
    scopeDrafts,
    setScopeDrafts,
    addGrant,
    revokeGrant,
  };
}

/** /os/integrations — connector registry: webhook/manual connectors, their health, and grants. */
export function ConnectorsPage() {
  const page = useConnectorsPage();
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Integrations</h2>
          <span>Connectors this workspace owns, their health, and who's granted access.</span>
        </div>
      </div>
      {page.error && <p className="activity-feed-status activity-feed-error">{page.error}</p>}
      {page.newSecret && (
        <p className="form-error" role="alert">
          Signing secret (shown once — store it now): <code>{page.newSecret.secret}</code>{' '}
          <button type="button" onClick={page.dismissSecret}>
            Dismiss
          </button>
        </p>
      )}
      {page.loading && <p className="activity-feed-status">Loading…</p>}
      {!page.loading && page.connectors.length === 0 && (
        <Empty title="No connectors yet">Register one below to start receiving events.</Empty>
      )}
      {!page.loading && page.connectors.length > 0 && (
        <ol className="activity-feed-list">
          {page.connectors.map((connector) => (
            <li key={connector.id} className="activity-feed-row" style={{ display: 'block' }}>
              <span className="activity-feed-icon">
                <Plug size={15} />
              </span>
              <strong>{connector.name}</strong> <small>({connector.type})</small>{' '}
              <StatusPill status={connector.status} />
              {connector.last_sync_at && <small> · last sync {new Date(connector.last_sync_at).toLocaleString()}</small>}
              <button
                type="button"
                disabled={page.busy}
                onClick={() => page.remove(connector.id)}
                aria-label={`Delete ${connector.name}`}
              >
                <Trash2 size={14} />
              </button>
              <ul>
                {(page.grantsByConnector[connector.id] || [])
                  .filter((g) => !g.revoked_at)
                  .map((grant) => (
                    <li key={grant.id}>
                      {grant.scope}
                      <button type="button" disabled={page.busy} onClick={() => page.revokeGrant(connector.id, grant.id)}>
                        Revoke
                      </button>
                    </li>
                  ))}
              </ul>
              <input
                type="text"
                placeholder="Add a scope (e.g. contacts:read)"
                value={page.scopeDrafts[connector.id] || ''}
                onChange={(e) => page.setScopeDrafts((prev) => ({ ...prev, [connector.id]: e.target.value }))}
              />
              <button type="button" disabled={page.busy} onClick={() => page.addGrant(connector.id)}>
                Grant
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="panel-heading" style={{ marginTop: 24 }}>
        <h3>Register a connector</h3>
      </div>
      <div className="settings-card">
        <input
          type="text"
          placeholder="Name"
          value={page.name}
          onChange={(e) => page.setName(e.target.value)}
        />
        <select value={page.type} onChange={(e) => page.setType(e.target.value as 'webhook' | 'manual')}>
          <option value="webhook">Webhook (signed, inbound)</option>
          <option value="manual">Manual (human-operated)</option>
        </select>
        <button type="button" disabled={page.busy || !page.name.trim()} onClick={page.create}>
          Register connector
        </button>
      </div>
    </section>
  );
}
