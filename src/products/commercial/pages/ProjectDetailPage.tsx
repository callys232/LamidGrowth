import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { SkeletonBlock, SkeletonLine } from '../../../shared/ui/Skeleton';
import { StatusPill } from '../../../shared/workspace/StatusPill';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
import { MilestoneCard } from '../components/MilestoneCard';
import { useProjectDetail, type ProjectMessage } from '../hooks/useProjectsPage';

/** /os/commercial/projects/:id — milestones, deliverables, verification, and approval for one project. */
export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const { state } = useWorkspace();
  const {
    project,
    loading,
    error,
    busy,
    addMilestone,
    addDeliverable,
    submitMilestone,
    verifySubmission,
    decide,
    fundMilestone,
    loadFunding,
    releaseMilestone,
    refundMilestone,
    loadMessages,
    sendMessage,
    submitReview,
    assignTeam,
  } = useProjectDetail(id);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [teamIdInput, setTeamIdInput] = useState('');
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [reviewRating, setReviewRating] = useState<Record<string, number>>({});
  const [reviewComment, setReviewComment] = useState<Record<string, string>>({});
  const [reviewedMilestoneIds, setReviewedMilestoneIds] = useState<string[]>([]);

  useEffect(() => {
    void loadMessages().then(setMessages);
  }, [loadMessages]);

  if (loading)
    return (
      <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SkeletonLine width={260} height={22} />
        <SkeletonLine width={380} height={12} />
        <SkeletonBlock height={100} />
        <SkeletonBlock height={100} />
      </section>
    );
  if (error) return <p className="activity-feed-status activity-feed-error">{error}</p>;
  if (!project) return null;

  const isFreelancer = project.freelancer_user_id === state.user.id;
  const isClient = !isFreelancer; // server enforces the real check; this only toggles which controls render

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{project.title}</h2>
          <span>Milestones, deliverables, and approvals for this project.</span>
        </div>
        <StatusPill status={project.status} />
      </div>

      {project.milestones.length === 0 ? (
        <p className="activity-feed-status">No milestones yet.</p>
      ) : (
        <ol className="activity-feed-list">
          {project.milestones.map((milestone) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              isClient={isClient}
              isFreelancer={isFreelancer}
              busy={busy}
              onAddDeliverable={(deliverableTitle, description, criteria) =>
                addDeliverable(milestone.id, { title: deliverableTitle, description, criteria })
              }
              onSubmit={(notes) => submitMilestone(milestone.id, notes)}
              onVerify={verifySubmission}
              onDecide={decide}
              onFund={fundMilestone}
              onLoadFunding={loadFunding}
              onRelease={releaseMilestone}
              onRefund={refundMilestone}
            />
          ))}
        </ol>
      )}

      {isClient && (
        <div className="theme-toggle">
          <input
            placeholder="Milestone title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            placeholder="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: 100 }}
          />
          <Button
            disabled={busy || !title.trim() || !amount}
            onClick={() => {
              void addMilestone({
                title,
                description: '',
                amount: Number(amount),
                currency: 'USD',
              });
              setTitle('');
              setAmount('');
            }}
          >
            Add milestone
          </Button>
        </div>
      )}

      {isClient && (
        <section className="panel settings-card">
          <h3>Expert team</h3>
          <p>
            Assign the whole team — led by the expert already engaged here — instead of adding
            specialists one at a time.
          </p>
          {project.assignedTeam ? (
            <div className="activity-feed-row">
              <span className="activity-feed-title">
                <strong>{project.assignedTeam.name}</strong>
                <br />
                <small>
                  {project.assignedTeam.members.length} member
                  {project.assignedTeam.members.length === 1 ? '' : 's'}
                </small>
              </span>
              <Button variant="secondary" disabled={busy} onClick={() => void assignTeam(null)}>
                Remove
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Team ID (shared by the freelancer)"
                value={teamIdInput}
                onChange={(e) => setTeamIdInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button
                disabled={busy || !teamIdInput.trim()}
                onClick={async () => {
                  await assignTeam(teamIdInput.trim());
                  setTeamIdInput('');
                }}
              >
                Assign team
              </Button>
            </div>
          )}
        </section>
      )}

      <section className="panel settings-card">
        <h3>Messages</h3>
        {messages.length === 0 ? (
          <p className="activity-feed-status">No messages yet.</p>
        ) : (
          <ol className="activity-feed-list">
            {messages.map((message) => (
              <li key={message.id} className="activity-feed-row">
                <span className="activity-feed-title">
                  <small>{new Date(message.created_at).toLocaleString()}</small>
                  <br />
                  {message.body}
                </span>
              </li>
            ))}
          </ol>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            placeholder="Write a message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{ flex: 1 }}
          />
          <Button
            disabled={busy || !draft.trim()}
            onClick={async () => {
              await sendMessage(draft);
              setDraft('');
              setMessages(await loadMessages());
            }}
          >
            Send
          </Button>
        </div>
      </section>

      {project.milestones.some((m) => m.status === 'approved') && (
        <section className="panel settings-card">
          <h3>Reviews</h3>
          <p>Leave a review for the other party on an approved milestone.</p>
          <ol className="activity-feed-list">
            {project.milestones
              .filter((m) => m.status === 'approved')
              .map((milestone) => (
                <li key={milestone.id} className="activity-feed-row">
                  <span className="activity-feed-title">
                    <strong>{milestone.title}</strong>
                  </span>
                  {reviewedMilestoneIds.includes(milestone.id) ? (
                    <StatusPill status="reviewed" />
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select
                        value={reviewRating[milestone.id] ?? 5}
                        onChange={(e) =>
                          setReviewRating((prev) => ({
                            ...prev,
                            [milestone.id]: Number(e.target.value),
                          }))
                        }
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n} / 5
                          </option>
                        ))}
                      </select>
                      <input
                        placeholder="Comment (optional)"
                        value={reviewComment[milestone.id] ?? ''}
                        onChange={(e) =>
                          setReviewComment((prev) => ({ ...prev, [milestone.id]: e.target.value }))
                        }
                      />
                      <Button
                        disabled={busy}
                        onClick={async () => {
                          const ok = await submitReview(
                            milestone.id,
                            reviewRating[milestone.id] ?? 5,
                            reviewComment[milestone.id] ?? '',
                          );
                          if (ok) setReviewedMilestoneIds((prev) => [...prev, milestone.id]);
                        }}
                      >
                        Submit review
                      </Button>
                    </div>
                  )}
                </li>
              ))}
          </ol>
        </section>
      )}
    </section>
  );
}
