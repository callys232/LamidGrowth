import { chromium } from '@playwright/test';
import { mkdirSync, copyFileSync } from 'node:fs';

const origin = process.env.DEMO_ORIGIN || 'http://127.0.0.1:3100';
const response = await fetch(`${origin}/api/engines/catalog`);
if (!response.ok) throw new Error(`Catalog: ${response.status}`);
const { engines } = await response.json();
const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
mkdirSync('public/videos/engines', { recursive: true });
mkdirSync('artifacts/engine-demo-recordings', { recursive: true });
const browser = await chromium.launch();
async function record(engine) {
  const response = await fetch(`${origin}/api/engines/${engine.code}`);
  if (!response.ok) throw new Error(`${engine.code}: ${response.status}`);
  const detail = await response.json();
  const input = detail.inputs;
  const labels =
    input.kind === 'schema'
      ? [
          ...input.fields.map((f) => f.label),
          ...input.tables.map((t) => `${t.label}: ${t.columns.map((c) => c.label).join(', ')}`),
        ]
      : input.kind === 'anchored'
        ? input.sections.map((s) => s.label)
        : input.kind === 'timeseries'
          ? input.metrics.map((m) => m.label)
          : detail.decisionQuality
            ? detail.decisionQuality.requirements.map((r) => r.label)
            : detail.dimensionLabels;
  const stages = [
    { title: 'Prepare your inputs', text: labels?.length ? labels.join(' · ') : detail.purpose },
    { title: 'Understand the analysis', text: detail.computes },
    { title: 'Review the scope before acting', text: detail.limits },
  ];
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: 'artifacts/engine-demo-recordings', size: { width: 1280, height: 800 } },
  });
  try {
    const page = await context.newPage();
    await page.setContent(
      `<html><head><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;background:#e9f1eb;color:#213d32}main{margin:28px;background:#fff;border-radius:24px;height:744px;overflow:hidden}header{padding:28px 36px;background:linear-gradient(120deg,#203c32,#416b57);color:white}small{font-size:12px;letter-spacing:2px}h1{font-size:32px;margin:12px 0}header p{font-size:17px;line-height:1.5;margin:0}.steps{display:flex;gap:12px;padding:24px 36px}.steps span{flex:1;padding:16px;background:#edf3ee;border-radius:12px}.steps .active{background:#cde5d6;font-weight:bold}section{margin:0 36px;padding:28px;border-radius:18px;background:linear-gradient(120deg,#edf4ef,#e8efdf)}h2{font-size:30px;margin:0 0 20px}section p{font-size:21px;line-height:1.65;margin:0;overflow-wrap:anywhere}footer{position:absolute;bottom:52px;left:64px;font-size:14px;color:#465a50}</style></head><body><main><header><small>${escape(engine.area)} · ENGINE WALKTHROUGH</small><h1>${escape(engine.engineName)}</h1><p>${escape(engine.purpose)}</p></header><div class="steps"><span>01 · Inputs</span><span>02 · Analysis</span><span>03 · Scope</span></div><section><h2></h2><p></p></section><footer>Instructional overview · Actual tool definitions · No diagnostic results shown</footer></main></body></html>`,
    );
    for (const [index, stage] of stages.entries()) {
      await page.evaluate(
        ({ index, stage }) => {
          document.querySelector('section h2').textContent = stage.title;
          document.querySelector('section p').textContent = stage.text;
          document
            .querySelectorAll('.steps span')
            .forEach((s, i) => s.classList.toggle('active', i === index));
          const text = document.querySelector('section p');
          let size = 21;
          while (
            document.querySelector('section').getBoundingClientRect().bottom > 690 &&
            size > 13
          )
            text.style.fontSize = `${--size}px`;
        },
        { index, stage },
      );
      await page.waitForTimeout(3200);
    }
    const video = page.video();
    await context.close();
    copyFileSync(await video.path(), `public/videos/engines/${engine.code}.webm`);
    console.log(`Recorded ${engine.code}: ${engine.engineName}`);
  } finally {
    await context.close();
  }
}
try {
  for (let start = 0; start < engines.length; start += 6)
    await Promise.all(engines.slice(start, start + 6).map(record));
} finally {
  await browser.close();
}
console.log(`Recorded ${engines.length} engine walkthroughs.`);
