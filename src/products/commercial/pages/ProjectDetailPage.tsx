import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
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
  } = useProjectDetail(id);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    void loadMessages().then(setMessages);
  }, [loadMessages]);

  if (loading) return <p className="activity-feed-status">Loading…</p>;
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
          <input placeholder="Milestone title" value={title} onChange={(e) => setTitle(e.target.value)} />
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
              void addMilestone({ title, description: '', amount: Number(amount), currency: 'USD' });
              setTitle('');
              setAmount('');
            }}
          >
            Add milestone
          </Button>
        </div>
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
          <input placeholder="Write a message" value={draft} onChange={(e) => setDraft(e.target.value)} style={{ flex: 1 }} />
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
    </section>
  );
}
