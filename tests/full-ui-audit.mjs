// Interaction observations are not assertions of business correctness. See report boundaries.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { auditHarness, profiles, tiers, fillFields } from './full-ui-harness.mjs';
import { catalogSummary } from '../src/app/engines.mjs';
import { demoToolCatalog } from '../src/app/demoAccess.mjs';

const phase = process.argv.find((arg) => arg.startsWith('--phase='))?.slice(8) || 'pages';
const selectedProfile = process.argv.find((arg) => arg.startsWith('--profile='))?.slice(10);
const selectedTier = process.argv.find((arg) => arg.startsWith('--tier='))?.slice(7);
const retryFailures = process.argv.includes('--retry-failures');
const priorFailures = retryFailures
  ? JSON.parse(readFileSync('lamiddoc/test-results/full-ui/tools.json', 'utf8')).engines.filter(
      (row) => row.outcome === 'failed',
    )
  : null;
const report = {
  phase,
  revision: 'see git revision in review',
  started: new Date().toISOString(),
  boundaries: [
    'Local production build; actual shipped demo sandbox handlers execute.',
    'Identity and cloud-save boundary use in-memory fixtures; no genuine inbox or server database in this browser suite.',
    'Engine requests execute real server calculation functions.',
    'External hosts and all unrecognised real API operations are blocked, never fabricated as success.',
    'A click with changed UI is interaction observed, not proof of a correct business result.',
    'Finite discovery: initially visible controls and controls revealed in one dialog layer; arbitrary state combinations are not exhaustive.',
  ],
  pages: [],
  controls: [],
  engines: [],
  critical: [],
  errors: [],
};
mkdirSync('lamiddoc/test-results/full-ui', { recursive: true });
const filename = `lamiddoc/test-results/full-ui/${phase}${retryFailures ? '-retry' : ''}${selectedProfile ? `-${selectedProfile}` : ''}${selectedTier ? `-${selectedTier}` : ''}.json`;
function save() {
  writeFileSync(filename, JSON.stringify(report, null, 2));
}
const harness = await auditHarness(report);
const appSource = readFileSync('src/App.tsx', 'utf8');
const nested = appSource.slice(appSource.indexOf('path="/os"'));
const workspacePaths = [
  '/os',
  ...[...nested.matchAll(/<Route path="([^":*]+)"/g)]
    .filter((match) => !match[1].startsWith('/'))
    .map((match) => `/os/${match[1]}`),
].filter((value, index, all) => all.indexOf(value) === index);
const alerts = async (page) =>
  (await page.locator('.form-error,[role="alert"]').allTextContents())
    .map((value) => value.trim())
    .filter(Boolean);
const hash = (value) => createHash('sha256').update(value).digest('hex');

async function inventory(scope) {
  return scope
    .locator(
      'button:visible,a:visible,summary:visible,select:visible,input:visible,textarea:visible',
    )
    .evaluateAll((elements) => {
      const repeats = new Map();
      return elements.map((element) => {
        const tag = element.tagName.toLowerCase();
        const label = (
          element.getAttribute('aria-label') ||
          element.innerText ||
          element.getAttribute('title') ||
          element.getAttribute('placeholder') ||
          element.name ||
          element.type ||
          'unnamed'
        )
          .trim()
          .replace(/\s+/g, ' ');
        const signature = `${tag}:${label}`;
        const occurrence = repeats.get(signature) || 0;
        repeats.set(signature, occurrence + 1);
        return {
          tag,
          label,
          occurrence,
          href: element.getAttribute('href'),
          type: element.type,
          disabled: element.disabled || element.getAttribute('aria-disabled') === 'true',
        };
      });
    });
}
async function locate(scope, target) {
  const nodes = scope.locator(`${target.tag}:visible`);
  let occurrence = 0;
  for (let i = 0; i < (await nodes.count()); i++) {
    const item = nodes.nth(i);
    const label = await item.evaluate((element) =>
      (
        element.getAttribute('aria-label') ||
        element.innerText ||
        element.getAttribute('title') ||
        element.getAttribute('placeholder') ||
        element.name ||
        element.type ||
        'unnamed'
      )
        .trim()
        .replace(/\s+/g, ' '),
    );
    if (label === target.label && occurrence++ === target.occurrence) return item;
  }
  return null;
}
async function exercise(session, path, control, parent = null) {
  const { page } = session;
  const row = {
    path,
    profile: session.identity.profile,
    tier: session.identity.tier,
    parent: parent?.label,
    ...control,
    outcome: 'unconfirmed',
  };
  report.controls.push(row);
  const watchdog = setTimeout(() => {
    row.watchdog = 'browser operation exceeded 10 seconds';
    void page.close().catch(() => {});
  }, 10000);
  try {
    await session.go(path);
    let scope = page.locator('.workspace-main').first();
    if (parent) {
      const opener = await locate(scope, parent);
      if (!opener) throw new Error('Parent control is no longer present in this state');
      await opener.click();
      scope = page.getByRole('dialog').last();
      await scope.waitFor();
    }
    const element = await locate(scope, control);
    if (!element) {
      row.outcome = 'unreachable-after-state-change';
      return;
    }
    const beforeRequests = session.requests.length,
      beforeDownloads = session.downloads.length;
    const beforeErrors = session.errors.length;
    const beforeUrl = page.url();
    const before = hash(await page.locator('body').innerText());
    if (['input', 'textarea'].includes(control.tag)) {
      if (control.type === 'file') {
        row.outcome = 'requires-file-fixture';
        return;
      }
      if (['checkbox', 'radio'].includes(control.type)) await element.check();
      else if (await element.isEditable()) {
        const form = element.locator('xpath=ancestor::form[1]');
        row.fieldIssues = await fillFields((await form.count()) ? form : scope);
      } else {
        row.outcome = 'readonly-or-disabled';
        return;
      }
      row.outcome = 'field-interaction-observed';
    } else if (control.tag === 'select') {
      const options = await element
        .locator('option:not([disabled])')
        .evaluateAll((els) => els.map((el) => ({ value: el.value, text: el.textContent })));
      row.options = [];
      for (const option of options) {
        await element.selectOption(option.value);
        await page.waitForTimeout(25);
        row.options.push({
          ...option,
          selected: await element.inputValue(),
          alerts: await alerts(page),
        });
      }
      row.outcome = 'select-options-exercised';
    } else {
      if (control.tag === 'button') {
        const form = element.locator('xpath=ancestor::form[1]');
        if (await form.count()) row.fieldIssues = await fillFields(form);
        else if (parent) row.fieldIssues = await fillFields(scope);
        if (!(await element.isEnabled())) {
          row.outcome = 'disabled-in-this-state';
          return;
        }
      }
      await element.click({ timeout: 2000 });
      await page.waitForTimeout(110);
      row.outcome =
        page.url() !== beforeUrl
          ? 'navigation-observed'
          : hash(await page.locator('body').innerText()) !== before
            ? 'ui-change-observed'
            : 'no-visible-change';
      if (!parent && control.tag === 'button' && (await page.getByRole('dialog').count())) {
        row.revealed = await inventory(page.getByRole('dialog').last());
      }
    }
    row.alerts = await alerts(page);
    row.requests = session.requests.slice(beforeRequests);
    row.errors = session.errors.slice(beforeErrors);
    row.downloads = session.downloads.slice(beforeDownloads);
    row.destination = page.url().replace(harness.origin, '');
    if (row.errors.length) row.outcome = 'runtime-error';
    else if (row.alerts.length) row.outcome = 'visible-error-or-validation';
    else if (
      row.requests.some((request) => request.status === 'blocked-external' || request.status >= 400)
    )
      row.outcome = 'blocked-real-boundary-or-http-error';
    else if (row.downloads.length) row.outcome = 'download-observed';
    for (const popup of session.popups.splice(0)) await popup.close().catch(() => {});
  } catch (error) {
    row.outcome = 'interaction-failed';
    row.error = error.message.split('\n')[0];
  } finally {
    clearTimeout(watchdog);
  }
}

async function pageAudit(profile, tier) {
  let session = await harness.session(profile, tier);
  const paths = [...workspacePaths];
  try {
    for (const path of paths) {
      const row = { profile, tier, path, outcome: 'unconfirmed' };
      report.pages.push(row);
      try {
        await session.go(path);
        row.alerts = await alerts(session.page);
        row.controls = await inventory(session.page.locator('.workspace-main'));
        row.outcome = row.alerts.length ? 'rendered-with-alerts' : 'rendered';
        row.overflow = await session.page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 2,
        );
        const links = await session.page
          .locator('.workspace-main a[href]')
          .evaluateAll((els) => els.map((el) => el.getAttribute('href')));
        for (const link of links)
          if (
            /^\/os\/(commercial\/projects|workflows)\/[^/?#]+$/.test(link) &&
            !paths.includes(link)
          )
            paths.push(link);
        for (const control of row.controls) {
          await exercise(session, path, control);
          const tested = report.controls.at(-1);
          save();
          if (session.page.isClosed()) {
            await session.context.close();
            session = await harness.session(profile, tier);
          }
          if (tested.revealed)
            for (const child of tested.revealed) {
              await exercise(session, path, child, control);
              save();
              if (session.page.isClosed()) {
                await session.context.close();
                session = await harness.session(profile, tier);
              }
            }
        }
      } catch (error) {
        row.outcome = 'page-failed';
        row.error = error.message.split('\n')[0];
      }
      save();
      console.log(
        `${profile}/${tier} ${path}: ${row.outcome}, ${row.controls?.length || 0} controls`,
      );
    }
    report.errors.push(...session.errors.map((error) => ({ profile, tier, ...error })));
  } finally {
    await session.context.close();
  }
}

async function engineAudit(profile, tier) {
  const session = await harness.session(profile, tier);
  try {
    const included = new Set(demoToolCatalog(tier).engines.map((entry) => entry.code));
    for (const engine of catalogSummary().engines) {
      if (
        priorFailures &&
        !priorFailures.some(
          (row) => row.profile === profile && row.tier === tier && row.code === engine.code,
        )
      )
        continue;
      const row = {
        profile,
        tier,
        code: engine.code,
        name: engine.engineName,
        included: included.has(engine.code),
        outcome: 'unconfirmed',
      };
      report.engines.push(row);
      try {
        await session.go(`/os/engines?engine=${engine.code}`);
        const form = session.page.locator('form.engine-form');
        if (!row.included) {
          row.formPresent = (await form.count()) > 0;
          row.outcome = row.formPresent ? 'unexpected-access' : 'locked-no-form';
          continue;
        }
        await form.waitFor();
        const example = form.getByRole('button', { name: 'Load an example', exact: true });
        if (await example.count()) await example.click();
        else {
          await fillFields(form);
          const numbers = form.locator('input[type="number"]');
          for (let i = 0; i < (await numbers.count()); i++) {
            const field = numbers.nth(i);
            if (!Number(await field.inputValue())) {
              const min = Number(await field.getAttribute('min')) || 0;
              const max = await field.getAttribute('max');
              await field.fill(
                String(Math.min(max === null ? Infinity : Number(max), Math.max(min, 1))),
              );
            }
          }
        }
        row.invalid = await form
          .locator('input,select,textarea')
          .evaluateAll((els) =>
            els
              .filter((el) => !el.checkValidity())
              .map((el) => ({ name: el.name, message: el.validationMessage })),
          );
        if (row.invalid.length) {
          row.outcome = 'synthetic-fixture-invalid';
          continue;
        }
        await form.locator('button[type="submit"]').click();
        await session.page.locator('.engine-result').waitFor();
        const text = await session.page.locator('.engine-result').innerText();
        row.outcome = /\bNaN\b|\bInfinity\b/.test(text) ? 'nonfinite-output' : 'result-rendered';
        row.resultExcerpt = text.slice(0, 300);
      } catch (error) {
        row.outcome = 'failed';
        row.error = error.message.split('\n')[0];
        row.alerts = await alerts(session.page);
      }
      save();
    }
    console.log(
      `Tools ${profile}/${tier}: ${report.engines.filter((row) => row.profile === profile && row.tier === tier).reduce((counts, row) => ({ ...counts, [row.outcome]: (counts[row.outcome] || 0) + 1 }), {}) && 'complete'}`,
    );
    report.errors.push(...session.errors.map((error) => ({ profile, tier, ...error })));
  } finally {
    await session.context.close();
    save();
  }
}
try {
  const jobs = profiles
    .filter((profile) => !selectedProfile || selectedProfile === profile)
    .flatMap((profile) =>
      tiers.filter((tier) => !selectedTier || tier === selectedTier).map((tier) => [profile, tier]),
    );
  let cursor = 0;
  await Promise.all(
    [0, 1, 2].map(async () => {
      while (cursor < jobs.length) {
        const [profile, tier] = jobs[cursor++];
        await (phase === 'tools' ? engineAudit : pageAudit)(profile, tier);
      }
    }),
  );
} finally {
  report.finished = new Date().toISOString();
  save();
  await harness.close();
}
console.log(
  JSON.stringify({
    file: filename,
    pages: report.pages.length,
    controls: report.controls.length,
    engines: report.engines.length,
    errors: report.errors.length,
  }),
);
