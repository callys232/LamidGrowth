import { useState } from 'react';
import { RhythmDiagnosis } from './RhythmDiagnosis';
import { Modal } from '../ui/Modal';
import tools from './suite-tools.json';
import './rhythm-tool-preview.css';

export function RhythmToolPreview({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState(false);
  const tool = tools.Consistency.find((tool) => tool.id === 'T12')!;
  return (
    <>
      <button
        type="button"
        className="button button-primary"
        onClick={() => {
          setDiagnosis(false);
          setOpen(true);
        }}
      >
        {label}
      </button>
      {open && (
        <Modal title={tool.name} onClose={() => setOpen(false)} wide>
          {diagnosis ? (
            <RhythmDiagnosis />
          ) : (
            <div className="rhythm-demo-layout">
              <div>
                <video
                  controls
                  playsInline
                  preload="metadata"
                  style={{ width: '100%', borderRadius: 16 }}
                  aria-label="Operating Rhythm demo using illustrative data"
                >
                  <source src="/videos/rhythm-demo.webm" type="video/webm" />
                  Your browser does not support this video.
                </video>
                <p>
                  Sample walkthrough: enter recurring meetings, analyze their time cost, and spot
                  missing review levels.
                </p>
              </div>
              <section className="rhythm-demo-benefits" aria-labelledby="rhythm-benefits-heading">
                <h3 id="rhythm-benefits-heading">Make your meetings work harder.</h3>
                <ul>
                  <li>
                    <strong>See the time cost</strong>
                    <span>Measure the person-hours your recurring meetings consume each week.</span>
                  </li>
                  <li>
                    <strong>Spot status-update overload</strong>
                    <span>
                      See how much meeting time is spent sharing updates, so you can consider
                      written alternatives.
                    </span>
                  </li>
                  <li>
                    <strong>Find gaps in your review rhythm</strong>
                    <span>
                      Check whether weekly, monthly, and quarterly reviews are represented.
                    </span>
                  </li>
                  <li>
                    <strong>Clarify meeting ownership</strong>
                    <span>Identify meetings missing an owner or a set agenda.</span>
                  </li>
                </ul>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => setDiagnosis(true)}
                >
                  Get your diagnosis
                </button>
              </section>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
