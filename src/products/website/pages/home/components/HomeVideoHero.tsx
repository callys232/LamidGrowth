import { useEffect, useRef } from 'react';
import { CopyLine } from '../../../../../shared/content/CopyLine';
import content from '../content.json';
import './home-video-hero.css';

export function HomeVideoHero() {
  const video = useRef<HTMLVideoElement>(null);

  // The background video plays as an endless loop. `loop` handles the normal case; the
  // `ended` and visibility handlers restart it if a browser stops it anyway (some do on
  // an ended event or after the tab has been in the background).
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.defaultPlaybackRate = 0.6;
    element.playbackRate = 0.6;
    element.loop = true;
    const play = () => {
      element.playbackRate = 0.6;
      element.play().catch(() => {});
    };
    const restart = () => {
      element.currentTime = 0;
      play();
    };
    const resume = () => {
      if (!document.hidden && element.paused) play();
    };
    play();
    element.addEventListener('ended', restart);
    document.addEventListener('visibilitychange', resume);
    return () => {
      element.removeEventListener('ended', restart);
      document.removeEventListener('visibilitychange', resume);
    };
  }, []);

  // Publishes how far the hero has scrolled away (0 at rest, 1 once it has left the
  // viewport) as --hero-exit, which home-video-hero.css uses to dim the video and to
  // lighten the following section from the hero's dark tone to the page background.
  const hero = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = hero.current;
    const page = section?.closest<HTMLElement>('.lamid-home');
    if (!section || !page) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const { bottom } = section.getBoundingClientRect();
      // Spread over 1.6 viewports so the dark lingers while the next slide scrolls in.
      const exit = Math.min(
        1,
        Math.max(0, (window.innerHeight - bottom) / (window.innerHeight * 1.6)),
      );
      page.style.setProperty('--hero-exit', exit.toFixed(3));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      page.style.removeProperty('--hero-exit');
    };
  }, []);

  const [tagline, outcome, supporting, audience, actions] = content.hero.paragraphs;
  // The tagline is set on two lines: the portal, then the growth it serves (in serif).
  const split = tagline.text.indexOf(' for ');
  const opening = split < 0 ? tagline.text : tagline.text.slice(0, split);
  const promise = split < 0 ? '' : tagline.text.slice(split + 5);

  return (
    <section ref={hero} className="homepage-video-hero" aria-labelledby="homepage-hero-heading">
      <video
        ref={video}
        className="homepage-hero-video"
        src="/media/homepage-hero.mp4"
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
      />
      <div className="homepage-hero-copy section-wrap">
        <div className="homepage-hero-main">
          <p className="homepage-hero-eyebrow">
            <span aria-hidden="true" />
            LAMID ONE
          </p>
          <h1 id="homepage-hero-heading" data-source-paragraph={tagline.sourceParagraph}>
            <span className="homepage-hero-opening">{opening}</span>{' '}
            {promise && (
              <span className="homepage-hero-promise">
                for <em>{promise}</em>
              </span>
            )}
          </h1>
          <p className="homepage-hero-outcome" data-source-paragraph={outcome.sourceParagraph}>
            {outcome.text}
          </p>
          <div className="homepage-hero-actions">
            <CopyLine text={actions.text} paragraph={actions.sourceParagraph} />
          </div>
        </div>
        <div className="homepage-hero-details">
          <p className="homepage-hero-support" data-source-paragraph={supporting.sourceParagraph}>
            {supporting.text}
          </p>
          <p className="homepage-hero-audience" data-source-paragraph={audience.sourceParagraph}>
            {audience.text}
          </p>
        </div>
      </div>
    </section>
  );
}
