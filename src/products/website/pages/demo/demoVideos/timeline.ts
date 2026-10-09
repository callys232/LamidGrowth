/** Timing helpers for the /demo "See it in motion" videos. Every video is a pure function of its
 * playback time `t` (ms), so pausing, jumping between chapters and reduced motion (render the last
 * frame) are exact — nothing depends on CSS animation state. */

/** 0 before `start`, 1 after `end`, eased in between. */
export function progress(t: number, start: number, end: number) {
  if (t <= start) return 0;
  if (t >= end) return 1;
  const x = (t - start) / (end - start);
  return 1 - Math.pow(1 - x, 3);
}

/** The first part of `text`, as if typed between `start` and `end`. */
export function typed(text: string, t: number, start: number, end: number) {
  if (t <= start) return '';
  if (t >= end) return text;
  return text.slice(0, Math.ceil(((t - start) / (end - start)) * text.length));
}

/** Whether a scene shown between `start` and `end` is on screen, with a short cross-fade. */
export function sceneStyle(t: number, start: number, end: number, fade = 260) {
  const opacity = t < start || t > end ? 0 : Math.min(1, (t - start) / fade, (end - t) / fade);
  return {
    opacity,
    visibility: opacity > 0 ? ('visible' as const) : ('hidden' as const),
  };
}

/** Fade (no movement) for an element that appears at `at`. */
export function appear(t: number, at: number, fade = 300) {
  return { opacity: progress(t, at, at + fade) };
}

export type VideoProps = { t: number };
