/** Sets a headline on exactly two lines, breaking at the most natural point nearest the middle:
 * a sentence end first, then a comma or dash, then a plain word gap. The text is unchanged;
 * hero-title.css sizes the type so the longer line fits the column. */
export function splitTitle(text: string): [string, string] {
  const middle = text.length / 2;
  const candidates = (pattern: RegExp) =>
    [...text.matchAll(pattern)].map((m) => (m.index ?? 0) + m[0].length);
  for (const pattern of [/[.?!]\s/g, /[,;:—–]\s/g, /\s/g]) {
    const breaks = candidates(pattern).filter(
      (i) => i > text.length * 0.25 && i < text.length * 0.75,
    );
    if (breaks.length) {
      const at = breaks.reduce((a, b) => (Math.abs(b - middle) < Math.abs(a - middle) ? b : a));
      return [text.slice(0, at).trimEnd(), text.slice(at)];
    }
  }
  return [text, ''];
}

export function TwoLineTitle({ text }: { text: string }) {
  const [first, second] = splitTitle(text);
  const longest = Math.max(first.length, second.length);
  return (
    <span className="two-line-title" style={{ '--title-chars': longest } as React.CSSProperties}>
      <span>{first}</span>
      {second && (
        <>
          {' '}
          <span>{second}</span>
        </>
      )}
    </span>
  );
}
