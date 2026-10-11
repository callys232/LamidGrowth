import { CalendarDays, CalendarRange, Clock, RefreshCw } from 'lucide-react';
import { RhythmToolPreview } from '../../../../shared/content/RhythmToolPreview';
import content from './content.json';
import './rhythm-public.css';

const cycles = [
  {
    label: 'Daily',
    title: content.sections[0].title,
    text: content.sections[0].paragraphs[1].text,
    Icon: Clock,
  },
  {
    label: 'Weekly',
    title: content.sections[1].title,
    text: content.sections[1].paragraphs[1].text,
    Icon: CalendarDays,
  },
  {
    label: 'Monthly',
    title: 'Look for patterns',
    text: 'Step back from individual tasks to review performance, outcomes, and changes in capability.',
    Icon: CalendarRange,
  },
  {
    label: 'Quarterly',
    title: 'Revisit direction',
    text: 'Review strategic priorities and decide what should change in the next cycle.',
    Icon: RefreshCw,
  },
];

export function RhythmContent() {
  const [active, setActive] = useState<string | null>(null);
  const cardInteraction = (id: string) => ({
    tabIndex: 0,
    'data-active': active === id,
    onFocus: () => setActive(id),
    onClick: () => setActive(id),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) {
        event.preventDefault();
        setActive(id);
      }
    },
  });
  return (
    <div className="rhythm-public-content">
      <section className="rhythm-cycle" aria-labelledby="rhythm-cycle-heading">
        <header className="rhythm-section-heading">
          <span className="rhythm-kicker">YOUR REVIEW CYCLE</span>
          <h2 id="rhythm-cycle-heading">A cadence that connects action to learning.</h2>
          <p>
            Give each review a purpose. Move from today’s priorities to the patterns that shape your
            next stage.
          </p>
        </header>
        <ol className="rhythm-cycle-grid">
          {cycles.map(({ label, title, text, Icon }, index) => (
            <li key={label} className="rhythm-cycle-card" {...cardInteraction(label)}>
              <div className="rhythm-cycle-top">
                <Icon size={25} strokeWidth={1.6} aria-hidden="true" />
                <span>0{index + 1}</span>
              </div>
              <span className="rhythm-kicker">{label}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
        <div className="rhythm-organization">
          <strong>{content.sections[2].title}</strong>
          <p data-source-paragraph={328}>{content.sections[2].paragraphs[1].text}</p>
        </div>
      </section>
      <section className="rhythm-diagnosis-split" aria-labelledby="rhythm-diagnosis-heading">
        <div className="rhythm-diagnosis-input">
          <span className="rhythm-kicker">OPERATING RHYTHM &amp; MEETING DESIGN</span>
          <h2 id="rhythm-diagnosis-heading">Make room for work that matters.</h2>
          <p>
            Understand the time your meetings consume and whether your review cadence covers the
            work ahead.
          </p>
          <h3>Start with your meeting picture</h3>
          <ul>
            <li>People in scope</li>
            <li>Recurring meetings and reviews</li>
            <li>Frequency, duration, and attendees</li>
            <li>Purpose, owner, and agenda</li>
          </ul>
          <RhythmToolPreview label="Watch the Rhythm demo" />
        </div>
        <div className="rhythm-diagnosis-output">
          <span className="rhythm-kicker">WHAT YOUR DIAGNOSIS REVEALS</span>
          <h3>From recurring meetings to useful signals.</h3>
          <ol>
            <li>
              <span className="rhythm-signal-number">01</span>
              <div>
                <strong>Your meeting time cost</strong>
                <p>
                  Weekly person-hours and time per person, calculated from the meetings you enter.
                </p>
              </div>
            </li>
            <li>
              <span className="rhythm-signal-number">02</span>
              <div>
                <strong>Status-update share</strong>
                <p>
                  How much meeting time is spent sharing updates, so you can consider written
                  alternatives.
                </p>
              </div>
            </li>
            <li>
              <span className="rhythm-signal-number">03</span>
              <div>
                <strong>Review coverage</strong>
                <p>Gaps in weekly delivery, monthly performance, and quarterly strategy reviews.</p>
              </div>
            </li>
            <li>
              <span className="rhythm-signal-number">04</span>
              <div>
                <strong>Ownership and preparation</strong>
                <p>Meetings without an owner or a set agenda.</p>
              </div>
            </li>
          </ol>
          <details className="rhythm-tool-limit">
            <summary>What this engine can tell you</summary>
            <p>
              The diagnosis uses the meetings you list. It does not read calendars or judge meeting
              quality. Review the findings against your context before changing your cadence.
            </p>
          </details>
        </div>
      </section>
      <section className="rhythm-learning" aria-labelledby="rhythm-learning-heading">
        <header className="rhythm-section-heading">
          <span className="rhythm-kicker">CARRY THE LEARNING FORWARD</span>
          <h2 id="rhythm-learning-heading">{content.sections[3].title}</h2>
          <p data-source-paragraph={330}>{content.sections[3].paragraphs[1].text}</p>
        </header>
        <div className="rhythm-learning-grid">
          {[
            ['What moved forward?', 'Recognize progress and the context behind it.'],
            ['What changed?', 'Record a useful insight, a blocker, or an assumption to revisit.'],
            ['What comes next?', 'Carry a clear priority or adjustment into your next cycle.'],
          ].map(([title, text]) => (
            <article key={title} {...cardInteraction(title)}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
import { useState, type KeyboardEvent } from 'react';
