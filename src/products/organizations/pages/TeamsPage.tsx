import { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { api } from '../../../api';
import { Empty } from '../../../shared/ui/Empty';
import { SkeletonList } from '../../../shared/ui/Skeleton';

type TeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  access_scope: string;
  created_at: string;
};
type Team = {
  id: string;
  name: string;
  lead_user_id: string;
  description: string;
  created_at: string;
  members: TeamMember[];
};

function useTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api<Team[]>('/expert-teams/mine', undefined, 'GET')
      .then((items) => {
        setTeams(items);
        setError('');
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => load(), [load]);

  const create = useCallback(async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api<Team>('/expert-teams', { name, description });
      setName('');
      setDescription('');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [name, description, load]);

  const removeMember = useCallback(
    async (teamId: string, userId: string) => {
      setBusy(true);
      try {
        await api<Team>(`/expert-teams/${teamId}/members/${userId}`, {}, 'DELETE');
        load();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  return { teams, loading, error, name, setName, description, setDescription, create, busy, removeMember };
}

/** /os/teams — the expert teams (pods) you lead or belong to, and their membership. */
export function TeamsPage() {
  const page = useTeamsPage();
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Teams</h2>
          <span>Expert teams (pods) you lead or belong to, and who's on each one.</span>
        </div>
      </div>
      {page.error && <p className="activity-feed-status activity-feed-error">{page.error}</p>}
      {page.loading && <SkeletonList rows={4} />}
      {!page.loading && page.teams.length === 0 && (
        <Empty title="No teams yet">Create a team below to start assigning pod work.</Empty>
      )}
      {!page.loading && page.teams.length > 0 && (
        <ol className="activity-feed-list">
          {page.teams.map((team) => (
            <li key={team.id} className="activity-feed-row" style={{ display: 'block' }}>
              <span className="activity-feed-icon">
                <Users size={15} />
              </span>
              <strong>{team.name}</strong>
              {team.description && <p>{team.description}</p>}
              <ul>
                {team.members.map((member) => (
                  <li key={member.id}>
                    {member.role || 'member'}
                    {member.user_id === team.lead_user_id ? ' (lead)' : ''}
                    {member.user_id !== team.lead_user_id && (
                      <button type="button" disabled={page.busy} onClick={() => page.removeMember(team.id, member.user_id)}>
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
      <div className="panel-heading" style={{ marginTop: 24 }}>
        <h3>Create a team</h3>
      </div>
      <div className="settings-card">
        <input
          type="text"
          placeholder="Team name"
          value={page.name}
          onChange={(e) => page.setName(e.target.value)}
        />
        <textarea
          placeholder="Description (optional)"
          value={page.description}
          onChange={(e) => page.setDescription(e.target.value)}
        />
        <button type="button" disabled={page.busy || !page.name.trim()} onClick={page.create}>
          Create team
        </button>
      </div>
    </section>
  );
}
