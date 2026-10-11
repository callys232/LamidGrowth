import { useEngineRun } from '../../products/engines/hooks/useEngineRun';
import { EngineForm } from '../../products/engines/pages/EnginesPage';
import { EngineResultView } from '../../products/engines/components/EngineResultView';

export function RhythmDiagnosis() {
  const { manifest, running, result, error, run } = useEngineRun('S05', true);
  return (
    <div>
      <p>Use your meeting data for a real diagnosis. This public run is not saved.</p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {result ? (
        <EngineResultView result={result.result} />
      ) : manifest ? (
        <EngineForm
          manifest={manifest}
          submitting={running}
          onSubmit={(input) => void run(input).catch(() => {})}
        />
      ) : (
        !error && <p role="status">Loading the Rhythm engine…</p>
      )}
    </div>
  );
}
