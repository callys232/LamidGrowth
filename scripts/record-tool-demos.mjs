import { chromium } from 'playwright';
import { copyFileSync, mkdirSync } from 'node:fs';
import { TOOLS, runCatalogTool, disclosureFor } from '../src/app/toolCatalog/catalog.mjs';

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const examples = [
  {
    id: 'clarity',
    tool: 'T04',
    title: 'OKR & Strategy Execution Review',
    purpose: 'Tracks objectives and key results against the time elapsed, so you see what is on pace and what is falling behind.',
    pillarColor: '#c12129',
    pillarBg: '#fbecea',
    inputHtml: `
      <div class="input-grid">
        <div class="input-card">
          <div class="input-card-header">
            <span class="input-badge">Cadence Setup</span>
            <span class="input-tag">Active Cycle</span>
          </div>
          <div class="input-row">
            <span class="input-label">Reporting Period</span>
            <span class="input-val">Q1 2026 (Jan 01 – Mar 31)</span>
          </div>
          <div class="input-row">
            <span class="input-label">As-of Review Date</span>
            <span class="input-val">Feb 15, 2026</span>
          </div>
          <div class="input-row">
            <span class="input-label">Methodology</span>
            <span class="input-val">OKR & Balanced Scorecard</span>
          </div>
        </div>
        <div class="input-card">
          <div class="input-card-header">
            <span class="input-badge">Key Result In Focus</span>
            <span class="input-tag pill-amber">In Progress</span>
          </div>
          <div class="input-row">
            <span class="input-label">Strategic Objective</span>
            <span class="input-val">Improve Delivery Speed & Quality</span>
          </div>
          <div class="input-row">
            <span class="input-label">Key Result Metric</span>
            <span class="input-val">Completed strategic client projects</span>
          </div>
          <div class="progress-wrap">
            <div class="progress-labels">
              <span>Target: 10 projects</span>
              <strong style="color:#c12129">Current: 4 completed (40%)</strong>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:40%;background:#c12129"></div></div>
          </div>
          <div class="input-row" style="margin-top:8px">
            <span class="input-label">Accountable Owner</span>
            <span class="input-val">Delivery Team Lead</span>
          </div>
        </div>
      </div>
    `,
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
    title: 'Skills Gap Analysis',
    purpose: 'Compares required and current skills by role and flags critical dependencies led by only one person.',
    pillarColor: '#6b7a3a',
    pillarBg: '#eff2e4',
    inputHtml: `
      <div class="input-grid">
        <div class="input-card" style="grid-column: span 2">
          <div class="input-card-header">
            <span class="input-badge">Target Cohort: Delivery & Transformation Team</span>
            <span class="input-tag">5 Members Tracked</span>
          </div>
          <div class="skill-table">
            <div class="skill-row">
              <div class="skill-info">
                <strong>Sprint Planning & Roadmapping</strong>
                <span class="skill-sub">Required: Level 5 (Advanced) · Current: Level 3 (Competent)</span>
              </div>
              <div class="skill-meter-block">
                <div class="meter-dots">
                  <span class="dot active" style="background:#6b7a3a"></span>
                  <span class="dot active" style="background:#6b7a3a"></span>
                  <span class="dot active" style="background:#6b7a3a"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                </div>
                <span class="risk-badge badge-warning">Gap: −2 Levels · 1 Person at Level (Key Dependency)</span>
              </div>
            </div>
            <div class="skill-row" style="margin-top:14px;padding-top:14px;border-top:1px solid #e2e8df">
              <div class="skill-info">
                <strong>Operations & Systems Analysis</strong>
                <span class="skill-sub">Required: Level 4 (Proficient) · Current: Level 4 (Proficient)</span>
              </div>
              <div class="skill-meter-block">
                <div class="meter-dots">
                  <span class="dot active" style="background:#2f6f73"></span>
                  <span class="dot active" style="background:#2f6f73"></span>
                  <span class="dot active" style="background:#2f6f73"></span>
                  <span class="dot active" style="background:#2f6f73"></span>
                  <span class="dot"></span>
                </div>
                <span class="risk-badge badge-success">Balanced Bench · 3 People Qualified</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
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
    title: 'Delivery Flow Metrics',
    purpose: 'Measures how fast and how predictably work flows: throughput, cycle time, work in progress and flow efficiency.',
    pillarColor: '#2f6f73',
    pillarBg: '#e6f0f0',
    inputHtml: `
      <div class="input-grid">
        <div class="input-card" style="grid-column: span 2">
          <div class="input-card-header">
            <span class="input-badge">Flow Cadence: Weekly Delivery Cycles (7-Day Sprints)</span>
            <span class="input-tag">3 Sprints Logged</span>
          </div>
          <div class="flow-grid">
            <div class="flow-col">
              <span class="flow-title">Sprint Week 1</span>
              <div class="flow-stat"><strong>8</strong> Throughput</div>
              <div class="flow-sub">Cycle Time: 5.0 days · WIP: 6 items</div>
            </div>
            <div class="flow-col">
              <span class="flow-title">Sprint Week 2</span>
              <div class="flow-stat" style="color:#2f6f73"><strong>10</strong> Throughput</div>
              <div class="flow-sub">Cycle Time: 4.0 days · WIP: 6 items</div>
            </div>
            <div class="flow-col">
              <span class="flow-title">Sprint Week 3</span>
              <div class="flow-stat"><strong>9</strong> Throughput</div>
              <div class="flow-sub">Cycle Time: 4.0 days · WIP: 5 items</div>
            </div>
          </div>
          <div class="flow-summary-bar">
            <span>Average Velocity: <strong>9.0 items/week</strong></span>
            <span>Average Cycle Time: <strong>4.3 days</strong></span>
            <span>Flow State: <strong style="color:#2f6f73">Stable & Predictable</strong></span>
          </div>
        </div>
      </div>
    `,
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
    title: 'Growth Opportunity Scoring',
    purpose: 'Ranks strategic initiatives using Reach, Impact, Confidence, and Effort to focus on highest-yield actions.',
    pillarColor: '#b8923a',
    pillarBg: '#f8f1e0',
    inputHtml: `
      <div class="input-grid">
        <div class="input-card">
          <div class="input-card-header">
            <span class="input-badge">Opportunity 1: Core Service Expansion</span>
            <span class="input-tag">Horizon 1</span>
          </div>
          <div class="input-row"><span class="input-label">Strategic Strategy</span><span class="input-val">Market Penetration</span></div>
          <div class="input-row"><span class="input-label">Target Reach</span><span class="input-val">1,000 Client Accounts</span></div>
          <div class="input-row"><span class="input-label">Impact Score</span><span class="input-val">High (1.0)</span></div>
          <div class="input-row"><span class="input-label">Confidence</span><span class="input-val">80% Evidence-backed</span></div>
        </div>
        <div class="input-card">
          <div class="input-card-header">
            <span class="input-badge">Opportunity 2: AI Growth Platform Suite</span>
            <span class="input-tag" style="background:#b8923a;color:#fff">Horizon 2</span>
          </div>
          <div class="input-row"><span class="input-label">Strategic Strategy</span><span class="input-val">Product Development</span></div>
          <div class="input-row"><span class="input-label">Target Reach</span><span class="input-val">500 Enterprise Accounts</span></div>
          <div class="input-row"><span class="input-label">Impact Score</span><span class="input-val">Transformational (2.0)</span></div>
          <div class="input-row"><span class="input-label">Confidence</span><span class="input-val">60% Market Validation</span></div>
        </div>
      </div>
    `,
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
  {
    id: 'integrations',
    tool: null,
    title: 'Slack & Salesforce Connections',
    purpose: 'Connect communication and CRM channels to synchronise project scope, client pipelines, and team alerts.',
    pillarColor: '#0d1a2b',
    pillarBg: '#edf2f7',
    inputHtml: `
      <div class="input-grid">
        <div class="input-card">
          <div class="input-card-header">
            <span class="input-badge">Salesforce Enterprise Cloud</span>
            <span class="input-tag" style="background:#107569;color:#fff">Connected</span>
          </div>
          <div class="input-row"><span class="input-label">Connection Type</span><span class="input-val">OAuth 2.0 Secure Snapshot</span></div>
          <div class="input-row"><span class="input-label">Pipeline Contacts</span><span class="input-val">3 Enterprise Deals</span></div>
          <div class="input-row"><span class="input-label">Permission Level</span><span class="input-val">Read-Only Context Export</span></div>
        </div>
        <div class="input-card">
          <div class="input-card-header">
            <span class="input-badge">Slack Strategic Channels</span>
            <span class="input-tag" style="background:#107569;color:#fff">Connected</span>
          </div>
          <div class="input-row"><span class="input-label">Active Workspace</span><span class="input-val">Executive Leadership Grid</span></div>
          <div class="input-row"><span class="input-label">Connected Channels</span><span class="input-val">#growth-steering, #advisory</span></div>
          <div class="input-row"><span class="input-label">Alert Cadence</span><span class="input-val">Instant Milestone Triggers</span></div>
        </div>
      </div>
    `,
    input: null,
  },
];

const CSS_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    margin: 0;
    background: #0f172a;
    color: #1e293b;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    padding: 20px;
  }
  main {
    width: 100%;
    max-width: 1220px;
    height: 660px;
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 25px 60px -15px rgba(0,0,0,0.3);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
    border: 1px solid rgba(255,255,255,0.1);
  }
  header {
    padding: 24px 36px 20px;
    background: #0d1a2b;
    color: #ffffff;
    border-bottom: 2px solid rgba(255,255,255,0.08);
  }
  .brand-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #f1f5f9;
  }
  .brand-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #c12129;
    box-shadow: 0 0 10px #c12129;
  }
  h1 {
    font-size: 26px;
    font-weight: 700;
    margin: 8px 0 6px;
    color: #ffffff;
    letter-spacing: -0.02em;
  }
  header p {
    font-size: 14px;
    color: #94a3b8;
    line-height: 1.45;
    max-width: 960px;
  }
  .steps-bar {
    display: flex;
    gap: 12px;
    padding: 16px 36px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }
  .step-tab {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    color: #64748b;
    transition: all 0.3s ease;
  }
  .step-tab.active {
    background: #0d1a2b;
    color: #ffffff;
    border-color: #0d1a2b;
    box-shadow: 0 4px 12px rgba(13, 26, 43, 0.15);
  }
  .step-num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: rgba(0,0,0,0.06);
    font-size: 11px;
    font-weight: 700;
  }
  .step-tab.active .step-num {
    background: rgba(255,255,255,0.2);
    color: #ffffff;
  }
  .content-stage {
    flex: 1;
    padding: 22px 36px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: #fafaf9;
  }
  .stage-title {
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .stage-tag {
    font-size: 11px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 6px;
    background: #e2e8f0;
    color: #334155;
    text-transform: uppercase;
  }
  .input-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }
  .input-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px 20px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.02);
  }
  .input-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid #f1f5f9;
  }
  .input-badge {
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.01em;
  }
  .input-tag {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    background: #ecfdf5;
    color: #065f46;
    text-transform: uppercase;
  }
  .input-tag.pill-amber {
    background: #fef3c7;
    color: #92400e;
  }
  .input-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    font-size: 13px;
  }
  .input-label {
    color: #64748b;
  }
  .input-val {
    font-weight: 600;
    color: #1e293b;
  }
  .progress-wrap {
    margin: 12px 0 6px;
    background: #f8fafc;
    border-radius: 8px;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
  }
  .progress-labels {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .progress-bar {
    height: 8px;
    border-radius: 999px;
    background: #e2e8f0;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: inherit;
    transition: width 0.8s ease;
  }
  .skill-table {
    display: flex;
    flex-direction: column;
  }
  .skill-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .skill-info strong {
    display: block;
    font-size: 14px;
    color: #0f172a;
    margin-bottom: 3px;
  }
  .skill-sub {
    font-size: 12px;
    color: #64748b;
  }
  .skill-meter-block {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }
  .meter-dots {
    display: flex;
    gap: 5px;
  }
  .meter-dots .dot {
    width: 22px;
    height: 8px;
    border-radius: 4px;
    background: #e2e8f0;
  }
  .risk-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 5px;
  }
  .badge-warning {
    background: #fff7ed;
    color: #9a3412;
    border: 1px solid #fed7aa;
  }
  .badge-success {
    background: #f0fdf4;
    color: #166534;
    border: 1px solid #bbf7d0;
  }
  .flow-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 14px;
  }
  .flow-col {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
    text-align: center;
  }
  .flow-title {
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
  }
  .flow-stat {
    font-size: 26px;
    font-weight: 800;
    color: #0f172a;
    margin: 4px 0;
  }
  .flow-sub {
    font-size: 11px;
    color: #64748b;
  }
  .flow-summary-bar {
    display: flex;
    justify-content: space-around;
    padding: 10px 14px;
    background: #f1f5f9;
    border-radius: 8px;
    font-size: 12px;
    color: #334155;
  }
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-bottom: 16px;
  }
  .kpi-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 18px 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  }
  .kpi-label {
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .kpi-value {
    font-size: 32px;
    font-weight: 800;
    color: #0f172a;
    margin-top: 6px;
    letter-spacing: -0.02em;
  }
  .analysis-narrative {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 18px 22px;
    font-size: 14px;
    line-height: 1.6;
    color: #334155;
    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
  }
  .analysis-narrative strong {
    color: #0f172a;
  }
  .scope-box {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 24px 28px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.03);
  }
  .scope-box h3 {
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 12px;
  }
  .scope-list {
    list-style: none;
    margin: 16px 0 20px;
    display: grid;
    gap: 10px;
  }
  .scope-list li {
    font-size: 14px;
    color: #334155;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .scope-list li::before {
    content: "✓";
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #ecfdf5;
    color: #059669;
    font-weight: bold;
    font-size: 12px;
  }
  footer {
    padding: 12px 36px;
    background: #ffffff;
    border-top: 1px solid #f1f5f9;
    font-size: 12px;
    color: #64748b;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
`;

mkdirSync('artifacts/tool-demo-recordings', { recursive: true });
mkdirSync('public/videos', { recursive: true });

async function recordAll() {
  const browser = await chromium.launch();
  try {
    for (const item of examples) {
      console.log(`Starting recording for ${item.id}...`);
      const result = item.tool
        ? runCatalogTool(item.tool, item.input)
        : {
            summary: { activeChannels: 2, contactsImported: 3, opportunitiesSynced: 2 },
            working: 'Verified OAuth authorization. Read-only snapshot synchronised across Slack strategy channels and Salesforce opportunities.',
          };
      const limits = item.tool
        ? disclosureFor(item.tool).limits
        : 'Illustrative connection flow. Live account authorization requires administrator OAuth setup.';

      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        recordVideo: {
          dir: 'artifacts/tool-demo-recordings',
          size: { width: 1280, height: 720 },
        },
      });

      const page = await context.newPage();

      const initialHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>${CSS_STYLES}</style>
        </head>
        <body>
          <main>
            <header>
              <div class="brand-badge">
                <span class="brand-dot" style="background:${item.pillarColor};box-shadow:0 0 10px ${item.pillarColor}"></span>
                <span>LAMID ONE · ${escape(item.id.toUpperCase())} · WALKTHROUGH</span>
              </div>
              <h1>${escape(item.title)}</h1>
              <p>${escape(item.purpose)}</p>
            </header>
            <div class="steps-bar">
              <div class="step-tab active" id="tab-1"><span class="step-num">01</span> Prepare inputs</div>
              <div class="step-tab" id="tab-2"><span class="step-num">02</span> Run analysis</div>
              <div class="step-tab" id="tab-3"><span class="step-num">03</span> Review scope</div>
            </div>
            <div class="content-stage">
              <div class="stage-title">
                <span id="stage-text">Step 01: Configure Inputs & Operational Context</span>
                <span class="stage-tag" style="background:${item.pillarBg};color:${item.pillarColor}">${escape(item.id)}</span>
              </div>
              <div id="screen-container">
                ${item.inputHtml}
              </div>
            </div>
            <footer>
              <span>LAMID ONE Intelligence Engine · Real calculation model</span>
              <span>Human-directed AI & adviser execution</span>
            </footer>
          </main>
        </body>
        </html>
      `;

      await page.setContent(initialHtml);
      // Wait at step 1 for 3.2 seconds
      await page.waitForTimeout(3200);

      // Transition to Step 2: Run analysis
      const numbers = Object.entries(result.summary)
        .filter(([, v]) => typeof v === 'number')
        .slice(0, 4);

      await page.evaluate(
        ({ numbers, working, pillarColor, pillarBg }) => {
          document.getElementById('tab-1').classList.remove('active');
          document.getElementById('tab-2').classList.add('active');
          document.getElementById('stage-text').textContent = 'Step 02: Analysis Results & Calculated Intelligence';
          const container = document.getElementById('screen-container');
          container.innerHTML = '';

          const grid = document.createElement('div');
          grid.className = 'metrics-grid';

          for (const [key, value] of numbers) {
            const card = document.createElement('div');
            card.className = 'kpi-card';
            const label = document.createElement('div');
            label.className = 'kpi-label';
            label.textContent = key.replace(/([A-Z])/g, ' $1');
            const val = document.createElement('div');
            val.className = 'kpi-value';
            val.style.color = pillarColor;
            val.textContent = typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : String(value);
            card.appendChild(label);
            card.appendChild(val);
            grid.appendChild(card);
          }
          container.appendChild(grid);

          const narrative = document.createElement('div');
          narrative.className = 'analysis-narrative';
          narrative.innerHTML = `<strong>Adviser Summary:</strong> ${working.slice(0, 420)}`;
          container.appendChild(narrative);
        },
        { numbers, working: result.working || JSON.stringify(result.summary), pillarColor: item.pillarColor, pillarBg: item.pillarBg },
      );

      // Wait at step 2 for 4 seconds
      await page.waitForTimeout(4000);

      // Transition to Step 3: Review scope
      await page.evaluate(
        ({ limits }) => {
          document.getElementById('tab-2').classList.remove('active');
          document.getElementById('tab-3').classList.add('active');
          document.getElementById('stage-text').textContent = 'Step 03: Decision Scope & Strategic Governance';
          const container = document.getElementById('screen-container');
          container.innerHTML = `
            <div class="scope-box">
              <h3>Governance, Safety & Decision Rights</h3>
              <ul class="scope-list">
                <li>Analysis uses verified parameters from current operational context.</li>
                <li>Strategic changes require authorized human stakeholder confirmation.</li>
                <li>Adviser review available before final resource commitment.</li>
              </ul>
              <div class="analysis-narrative" style="background:#f8fafc;border-left:4px solid #0d1a2b">
                <strong>Scope Note:</strong> ${limits}
              </div>
            </div>
          `;
        },
        { limits },
      );

      // Wait at step 3 for 3.2 seconds
      await page.waitForTimeout(3200);

      const video = page.video();
      await context.close();
      const videoPath = await video.path();

      copyFileSync(videoPath, `public/videos/${item.id}-demo.webm`);
      console.log(`Saved public/videos/${item.id}-demo.webm`);
    }
    console.log('All demo videos re-recorded successfully with polished UI!');
  } finally {
    await browser.close();
  }
}

recordAll().catch((err) => {
  console.error('Error recording videos:', err);
  process.exit(1);
});

