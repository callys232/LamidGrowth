import { chromium } from '@playwright/test';
import { copyFileSync, mkdirSync } from 'node:fs';
import { TOOLS, runCatalogTool, disclosureFor } from '../src/app/toolCatalog/catalog.mjs';

const examples = [
  {
    id: 'clarity',
    tool: 'T04',
    input: {
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
      asOf: '2026-02-15',
      keyResults: [
        {
          objective: 'Improve delivery',
          keyResult: 'Completed projects',
          start: 0,
          target: 10,
          current: 4,
          owner: 'Team lead',
        },
      ],
    },
  },
  {
    id: 'capability',
    tool: 'T40',
    input: {
      skills: [
        { role: 'Delivery team', skill: 'Planning', required: 5, current: 3, peopleAtLevel: 1 },
        { role: 'Delivery team', skill: 'Analysis', required: 4, current: 4, peopleAtLevel: 3 },
      ],
    },
  },
  {
    id: 'consistency',
    tool: 'T06',
    input: {
      periodDays: 7,
      periods: [
        { label: 'Week 1', throughput: 8, cycleTimeDays: 5, wip: 6, activeDays: 3 },
        { label: 'Week 2', throughput: 10, cycleTimeDays: 4, wip: 6, activeDays: 3 },
        { label: 'Week 3', throughput: 9, cycleTimeDays: 4, wip: 5, activeDays: 3 },
      ],
    },
  },
  {
    id: 'growth',
    tool: 'T51',
    input: {
      opportunities: [
        {
          opportunity: 'Improve the core offer',
          horizon: 'H1 — extend the core',
          ansoff: 'market penetration',
          reach: 1000,
          impact: 1,
          confidence: 80,
          effort: 2,
        },
        {
          opportunity: 'Launch a new offer',
          horizon: 'H2 — build emerging business',
          ansoff: 'product development',
          reach: 500,
          impact: 2,
          confidence: 60,
          effort: 4,
        },
      ],
    },
  },
];
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
mkdirSync('artifacts/tool-demo-recordings', { recursive: true });
mkdirSync('public/videos', { recursive: true });
const browser = await chromium.launch();
try {
  for (const item of [...examples, { id: 'integrations' }]) {
    const result = item.tool
      ? runCatalogTool(item.tool, item.input)
      : {
          summary: { channels: 2, contacts: 3, opportunities: 2 },
          working: 'Authorize an account, import a read-only snapshot, and review its last update.',
        };
    const title = item.tool ? TOOLS[item.tool].name : 'Slack & Salesforce connections';
    const purpose = item.tool
      ? TOOLS[item.tool].purpose
      : 'Import public-channel details or contacts and opportunities into your workspace.';
    const limits = item.tool
      ? disclosureFor(item.tool).limits
      : 'Illustrative connection flow. Live account authorization requires administrator OAuth setup.';
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: 'artifacts/tool-demo-recordings', size: { width: 1280, height: 720 } },
    });
    const page = await context.newPage();
    await page.setContent(
      `<html><head><style>*{box-sizing:border-box}body{margin:0;background:#edf3ee;color:#213d32;font-family:Arial,sans-serif}main{margin:32px;background:#fff;border-radius:24px;overflow:hidden;height:656px;box-shadow:0 16px 50px #17342818}header{padding:28px 36px;background:#203f34;color:white}small{letter-spacing:2px;font-size:11px}h1{font-size:34px;margin:12px 0}header p{font-size:16px;margin:0;max-width:950px;line-height:1.5}.steps{display:flex;gap:12px;padding:22px 36px}.steps span{flex:1;padding:12px 16px;background:#eef3ef;border-radius:10px}.steps span.active{background:#cde5d6;font-weight:bold}.body{padding:0 36px}h2{font-size:23px;margin:8px 0 16px}pre{font-size:16px;line-height:1.7;white-space:pre-wrap;max-height:250px;overflow:hidden;padding:20px;background:#f4f6f2;border-radius:14px}.metrics{display:flex;gap:14px}.metric{flex:1;background:#edf4ed;border:1px solid #cddfd0;border-radius:16px;padding:24px}.metric strong{display:block;font-size:32px;margin-top:16px}.caption{font-size:14px;color:#536759;line-height:1.6;margin-top:20px}footer{position:absolute;bottom:55px;left:70px;color:#56685f;font-size:13px}</style></head><body><main><header><small>LAMID ONE · ${escape(item.id.toUpperCase())} · SAMPLE WALKTHROUGH</small><h1>${escape(title)}</h1><p>${escape(purpose)}</p></header><div class="steps"><span class="active">01 · Prepare inputs</span><span>02 · Run analysis</span><span>03 · Review scope</span></div><div class="body"><h2 id="stage">Provide the information the tool needs</h2><div id="screen"><pre>${escape(JSON.stringify(item.input || { service: 'Slack or Salesforce', access: 'Provider authorization', action: 'Import snapshot' }, null, 2))}</pre></div></div><footer>Illustrative data · ${item.tool ? 'Results calculated by the actual tool' : 'Connection-flow illustration'}</footer></main></body></html>`,
    );
    await page.waitForTimeout(3200);
    const numbers = Object.entries(result.summary)
      .filter(([, v]) => typeof v === 'number')
      .slice(0, 4);
    await page.evaluate(
      ({ numbers, working }) => {
        document
          .querySelectorAll('.steps span')
          .forEach((el, i) => el.classList.toggle('active', i === 1));
        document.getElementById('stage').textContent = 'Review the analysis';
        const screen = document.getElementById('screen');
        screen.textContent = '';
        const grid = document.createElement('div');
        grid.className = 'metrics';
        for (const [label, value] of numbers) {
          const tile = document.createElement('div');
          tile.className = 'metric';
          tile.textContent = label.replace(/([A-Z])/g, ' $1');
          const strong = document.createElement('strong');
          strong.textContent = String(value);
          tile.append(strong);
          grid.append(tile);
        }
        screen.append(grid);
        const p = document.createElement('p');
        p.className = 'caption';
        p.textContent = working.slice(0, 450);
        screen.append(p);
      },
      { numbers, working: result.working || JSON.stringify(result.summary) },
    );
    await page.waitForTimeout(4000);
    await page.evaluate((limits) => {
      document
        .querySelectorAll('.steps span')
        .forEach((el, i) => el.classList.toggle('active', i === 2));
      document.getElementById('stage').textContent =
        'Understand the scope before choosing your next action';
      document.getElementById('screen').textContent = '';
      const p = document.createElement('p');
      p.className = 'caption';
      p.style.fontSize = '23px';
      p.textContent = limits;
      document.getElementById('screen').append(p);
    }, limits);
    await page.waitForTimeout(3200);
    const video = page.video();
    await context.close();
    copyFileSync(await video.path(), `public/videos/${item.id}-demo.webm`);
    console.log(`Recorded ${item.id}`);
  }
} finally {
  await browser.close();
}
