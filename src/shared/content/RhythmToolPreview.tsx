import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import tools from './suite-tools.json';
import './rhythm-tool-preview.css';
import { RhythmBenefits } from './RhythmBenefits';

export function RhythmToolPreview({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const tool = tools.Consistency.find((tool) => tool.id === 'T12')!;
  return (
    <>
      <button
        type="button"
        className="button button-primary"
        onClick={() => {
          setOpen(true);
        }}
      >
        {label}
      </button>
      {open && (
        <Modal title={tool.name} onClose={() => setOpen(false)} wide>
          {
            <div className="rhythm-demo-layout">
              <div className="rhythm-demo-video-column">
                <h3>See Rhythm in action</h3>
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  style={{ width: '100%', borderRadius: 16 }}
                  aria-label="Operating Rhythm demo using illustrative data"
                >
                  <source src="/videos/rhythm-demo.webm" type="video/webm" />
                  Your browser does not support this video.
                </video>
              </div>
              <RhythmBenefits />
              <div className="rhythm-demo-action">
                <p className="rhythm-demo-caption">
                  Sample walkthrough with illustrative meeting data and a real tool result.
                </p>
                <Link to="/os/engines?tool=S05" className="button button-primary">
                  Get your diagnosis
                </Link>
              </div>
            </div>
          }
        </Modal>
      )}
    </>
  );
}
