import { useState } from 'react';
import { Play } from 'lucide-react';
import { Modal } from '../../../../shared/ui/Modal';
import { DecisionQualityPreview } from './DecisionQualityPreview';
import { DemoVideoPlayer } from './DemoVideoPlayer';
import type { FeaturedTool } from './featuredTools';
import './engine-demo-preview.css';

export function EngineDemoPreview({ tool, onTry }: { tool: FeaturedTool; onTry: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="button button-secondary"
        aria-label={`Demo engine: ${tool.name}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Play size={16} aria-hidden="true" />
        Demo engine
      </button>
      {open && (
        <Modal title={`${tool.name} demo`} onClose={() => setOpen(false)} wide>
          <div className="engine-demo-preview">
            <div className="engine-demo-visual">
              {tool.code === 'Q44' ? (
                <DecisionQualityPreview />
              ) : (
                <DemoVideoPlayer engineCode={tool.code} single />
              )}
            </div>
            <aside>
              <h3>What this engine helps you do</h3>
              <ul>
                {tool.benefits.map((benefit) => (
                  <li key={benefit.title}>
                    <strong>{benefit.title}</strong>
                    <p>{benefit.body}</p>
                  </li>
                ))}
              </ul>
            </aside>
            <footer>
              <p>Sample walkthrough with illustrative inputs. {tool.limit}</p>
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  setOpen(false);
                  onTry();
                }}
              >
                Try {tool.name}
              </button>
            </footer>
          </div>
        </Modal>
      )}
    </>
  );
}
