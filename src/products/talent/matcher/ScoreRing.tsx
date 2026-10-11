/** A 0–100 score as a ring; strong scores use the full talent colour. */
export function ScoreRing({ score, label = 'Match score' }: { score: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      className="ws-score-ring"
      data-strength={clamped >= 60 ? 'strong' : clamped >= 35 ? 'fair' : 'weak'}
      role="img"
      aria-label={`${label}: ${clamped} out of 100`}
    >
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={radius} className="ws-score-track" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          className="ws-score-value"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      <strong>{clamped}</strong>
    </div>
  );
}
