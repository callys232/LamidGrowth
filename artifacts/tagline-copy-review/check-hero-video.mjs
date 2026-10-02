import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://127.0.0.1:3120');
  const gap = () => page.evaluate(() => document.querySelector('.homepage-video-hero').getBoundingClientRect().top - document.querySelector('.public-header').getBoundingClientRect().bottom);
  if (Math.abs(await gap()) > 0.5) throw new Error('Desktop navbar–hero gap remains');
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return video && video.readyState >= 2 && video.currentTime > 0;
  }, { timeout: 30000 });
  const media = await page.locator('video').evaluate(video => ({ width: video.videoWidth, height: video.videoHeight, duration: video.duration, muted: video.muted, playing: !video.paused, playbackRate: video.playbackRate }));
  if (media.playbackRate !== 0.6) throw new Error('Video speed is incorrect');
  if (await page.locator('.homepage-video-control').count()) throw new Error('Playback control remains');
  await page.screenshot({ path: 'artifacts/tagline-copy-review/hero-video-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  if (Math.abs(await gap()) > 0.5) throw new Error('Mobile navbar–hero gap remains');
  await page.screenshot({ path: 'artifacts/tagline-copy-review/hero-video-mobile.png' });
  const overflow = await page.locator('.homepage-video-hero').evaluate(hero => hero.scrollWidth > hero.clientWidth);
  if (overflow) throw new Error('Hero has mobile horizontal overflow');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.waitForSelector('video');
  if (!(await page.locator('video').evaluate(video => video.paused))) throw new Error('Reduced-motion preference was ignored');
  console.log(JSON.stringify({ media, controlsRemoved: true, mobileHeroOverflow: overflow, reducedMotion: 'passed' }, null, 2));
} finally {
  await browser.close();
}
