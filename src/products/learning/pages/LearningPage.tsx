import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { Empty } from '../../../shared/ui/Empty';
import { Field } from '../../../shared/ui/Field';
import { StatusPill } from '../../../shared/workspace/StatusPill';
import { useLearningPage } from '../hooks/useLearningPage';

/** /os/learning — capability-building catalog, enrollments, and progress tracking. */
export function LearningPage() {
  const page = useLearningPage();
  const [ratingByPath, setRatingByPath] = useState<Record<string, number>>({});
  const [commentByPath, setCommentByPath] = useState<Record<string, string>>({});

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Learning</h2>
          <span>
            Close a capability gap with a learning path — free or paid, self-paced or coached.
          </span>
        </div>
      </div>

      {page.error && (
        <p className="form-error" role="alert">
          {page.error}
        </p>
      )}

      {(page.attention.needsYou.length > 0 || page.attention.stalled.length > 0) && (
        <section className="panel settings-card">
          <h3>Needs your attention</h3>
          {page.attention.needsYou.length > 0 && (
            <>
              <p>Due soon</p>
              <ol className="activity-feed-list">
                {page.attention.needsYou.map((e) => (
                  <li key={e.id} className="activity-feed-row">
                    <span className="activity-feed-title">{e.path_title}</span>
                    <StatusPill status="needs you" />
                  </li>
                ))}
              </ol>
            </>
          )}
          {page.attention.stalled.length > 0 && (
            <>
              <p>Stalled — not yet started</p>
              <ol className="activity-feed-list">
                {page.attention.stalled.map((e) => (
                  <li key={e.id} className="activity-feed-row">
                    <span className="activity-feed-title">{e.path_title}</span>
                    <StatusPill status="stalled" />
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      )}

      <section className="panel settings-card">
        <h3>My enrollments</h3>
        {page.enrollments.length === 0 ? (
          <Empty title="No enrollments yet">
            Enroll in a path from the catalog below to start building capability.
          </Empty>
        ) : (
          <ol className="activity-feed-list">
            {page.enrollments.map((enrollment) => (
              <li key={enrollment.id} className="activity-feed-row">
                <span className="activity-feed-title">
                  <strong>{enrollment.path_title}</strong>
                  <br />
                  <small>
                    {enrollment.progress}% complete
                    {enrollment.due_at
                      ? ` · due ${new Date(enrollment.due_at).toLocaleDateString()}`
                      : ''}
                  </small>
                </span>
                <StatusPill status={enrollment.status.replace('_', ' ')} />
                {enrollment.status === 'completed' && (
                  <Button
                    variant="secondary"
                    disabled={page.busy}
                    onClick={() => void page.issueCertificate(enrollment.id)}
                  >
                    Issue certificate
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {page.compliance.length > 0 && (
        <section className="panel settings-card">
          <h3>Required training</h3>
          <p>Set by your organization — distinct from voluntary capability-building above.</p>
          <ol className="activity-feed-list">
            {page.compliance.map((c) => (
              <li key={c.id} className="activity-feed-row">
                <span className="activity-feed-title">
                  <strong>{c.path_title}</strong>
                  <br />
                  <small>
                    {c.mandatory ? 'Mandatory' : 'Recommended'}
                    {c.due_days ? ` · due within ${c.due_days} days` : ''}
                  </small>
                </span>
                <StatusPill
                  status={
                    c.enrollment_status ? c.enrollment_status.replace('_', ' ') : 'not started'
                  }
                />
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="panel settings-card">
        <h3>Create a learning path</h3>
        <p>
          Add modules afterward — a path can mix reading, video, exercises, and scored assessments.
        </p>
        <form onSubmit={page.createPath}>
          <Field label="Title">
            <input
              name="title"
              required
              maxLength={200}
              placeholder="e.g. Financial Modeling Basics"
            />
          </Field>
          <Field label="Description">
            <input name="description" maxLength={4000} placeholder="What this path builds toward" />
          </Field>
          <Field label="Domain" hint="e.g. Finance, Technology and engineering">
            <input name="domain" placeholder="Optional" />
          </Field>
          <Field label="Estimated hours">
            <input name="estimatedHours" type="number" min={0} step="0.5" />
          </Field>
          <Field label="Points cost" hint="Leave blank for a free path">
            <input name="pointsCost" type="number" min={0} />
          </Field>
          <Button type="submit" disabled={page.busy}>
            Create path
          </Button>
        </form>
      </section>

      <section className="panel settings-card">
        <h3>Catalog</h3>
        <p>
          Every published path, platform-wide — filterable by the same domain/function/industry
          taxonomy used for experts.
        </p>
        {page.catalog.length === 0 ? (
          <Empty title="No paths yet">Create the first one above.</Empty>
        ) : (
          <ol className="activity-feed-list">
            {page.catalog.map((path) => (
              <li key={path.id} className="activity-feed-row">
                <span className="activity-feed-title">
                  <strong>{path.title}</strong>
                  <br />
                  <small>
                    {path.domain || 'General'}
                    {path.estimated_hours ? ` · ~${path.estimated_hours}h` : ''}
                    {path.points_cost ? ` · ${path.points_cost} points` : ' · Free'}
                    {path.feedback.count > 0
                      ? ` · ${path.feedback.average?.toFixed(1)}★ (${path.feedback.count})`
                      : ''}
                    {path.modules.length > 0
                      ? ` · ${path.modules.length} module${path.modules.length === 1 ? '' : 's'}`
                      : ''}
                  </small>
                </span>
                <Button disabled={page.busy} onClick={() => void page.enroll(path.id)}>
                  Enroll
                </Button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel settings-card">
        <h3>Modules in progress</h3>
        <p>
          Mark modules complete as you go — completing every module in a path finishes it
          automatically.
        </p>
        {page.catalog
          .filter((path) =>
            page.enrollments.some((e) => e.path_id === path.id && e.status === 'in_progress'),
          )
          .flatMap((path) => path.modules.map((module) => ({ path, module }))).length === 0 ? (
          <Empty title="Nothing in progress">Enroll in a path above to see its modules here.</Empty>
        ) : (
          <ol className="activity-feed-list">
            {page.catalog
              .filter((path) =>
                page.enrollments.some((e) => e.path_id === path.id && e.status === 'in_progress'),
              )
              .flatMap((path) => path.modules.map((module) => ({ path, module })))
              .map(({ path, module }) => (
                <li key={module.id} className="activity-feed-row">
                  <span className="activity-feed-title">
                    <strong>{module.title}</strong>
                    <br />
                    <small>
                      {path.title} · {module.format}
                    </small>
                  </span>
                  {module.format === 'assessment' ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const score = Number(new FormData(event.currentTarget).get('score'));
                        void page.completeModule(module.id, score);
                      }}
                      style={{ display: 'flex', gap: 8 }}
                    >
                      <input
                        name="score"
                        type="number"
                        min={0}
                        max={100}
                        placeholder="Score"
                        required
                        style={{ width: 80 }}
                      />
                      <Button type="submit" disabled={page.busy}>
                        Submit
                      </Button>
                    </form>
                  ) : (
                    <Button
                      disabled={page.busy}
                      onClick={() => void page.completeModule(module.id)}
                    >
                      Mark complete
                    </Button>
                  )}
                </li>
              ))}
          </ol>
        )}
      </section>

      <section className="panel settings-card">
        <h3>Leave feedback</h3>
        <p>
          Rate a path you've completed so out-of-date or unhelpful content can be found and fixed.
        </p>
        {page.enrollments.filter((e) => e.status === 'completed').length === 0 ? (
          <Empty title="Nothing to rate yet">Complete a path to leave feedback on it.</Empty>
        ) : (
          <ol className="activity-feed-list">
            {page.enrollments
              .filter((e) => e.status === 'completed')
              .map((enrollment) => (
                <li key={enrollment.id} className="activity-feed-row">
                  <span className="activity-feed-title">{enrollment.path_title}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={ratingByPath[enrollment.path_id] ?? 5}
                      onChange={(e) =>
                        setRatingByPath((prev) => ({
                          ...prev,
                          [enrollment.path_id]: Number(e.target.value),
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
                      value={commentByPath[enrollment.path_id] ?? ''}
                      onChange={(e) =>
                        setCommentByPath((prev) => ({
                          ...prev,
                          [enrollment.path_id]: e.target.value,
                        }))
                      }
                    />
                    <Button
                      disabled={page.busy}
                      onClick={() =>
                        void page.submitFeedback(
                          enrollment.path_id,
                          ratingByPath[enrollment.path_id] ?? 5,
                          commentByPath[enrollment.path_id] ?? '',
                        )
                      }
                    >
                      Submit
                    </Button>
                  </div>
                </li>
              ))}
          </ol>
        )}
      </section>
    </section>
  );
}
