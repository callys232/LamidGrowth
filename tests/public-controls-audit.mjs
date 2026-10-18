import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { auditHarness, fillFields } from './full-ui-harness.mjs';
const report = {
  started: new Date().toISOString(),
  boundary:
    'Local shipped public UI. Real API submissions and external destinations blocked; these are explicitly unverified.',
  pages: [],
  controls: [],
  errors: [],
};
mkdirSync('lamiddoc/test-results/full-ui', { recursive: true });
const save = () =>
  writeFileSync('lamiddoc/test-results/full-ui/public-controls.json', JSON.stringify(report, null, 2));
const harness = await auditHarness(report);
const paths = [
  ...new Set([
    ...JSON.parse(readFileSync('src/content/pages.json', 'utf8')).map((page) => page.route),
    '/signup',
    '/login',
    '/forgot-password',
    '/reset-password',
    '/verify',
    '/demo',
  ]),
].filter((path) => !path.startsWith('/os'));
const labelOf = (element) =>
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
    .replace(/\s+/g, ' ');
try {
  let cursor = 0;
  await Promise.all(
    [0, 1].map(async () => {
      let session = await harness.session('Public', 'individual', true);
      try {
        while (cursor < paths.length) {
          const path = paths[cursor++];
          const row = { path, outcome: 'unconfirmed' };
          report.pages.push(row);
          try {
            await session.go(path);
            const scope = session.page.locator(path === '/' ? 'body' : 'main').first();
            row.title = await session.page.title();
            row.controls = await scope
              .locator(
                'button:visible,a:visible,input:visible,textarea:visible,select:visible,summary:visible',
              )
              .evaluateAll((els) => {
                const counts = new Map();
                return els.map((element) => {
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
                  const key = `${tag}:${label}`,
                    occurrence = counts.get(key) || 0;
                  counts.set(key, occurrence + 1);
                  return {
                    tag,
                    label,
                    occurrence,
                    href: element.getAttribute('href'),
                    type: element.type,
                  };
                });
              });
            row.outcome = 'rendered';
            for (const control of row.controls) {
              const result = { path, ...control, outcome: 'unconfirmed' };
              report.controls.push(result);
              const watchdog = setTimeout(() => {
                result.watchdog = true;
                void session.page.close().catch(() => {});
              }, 10000);
              try {
                await session.go(path);
                const currentScope = session.page.locator(path === '/' ? 'body' : 'main').first();
                const candidates = currentScope.locator(`${control.tag}:visible`);
                let found = null,
                  occurrence = 0;
                for (let i = 0; i < (await candidates.count()); i++)
                  if (
                    (await candidates.nth(i).evaluate(labelOf)) === control.label &&
                    occurrence++ === control.occurrence
                  ) {
                    found = candidates.nth(i);
                    break;
                  }
                if (!found) {
                  result.outcome = 'not-present-after-reload';
                  continue;
                }
                const requests = session.requests.length;
                if (!(await found.isEnabled())) {
                  result.outcome = 'disabled-in-initial-state';
                  continue;
                }
                if (control.tag === 'input' || control.tag === 'textarea') {
                  if (control.type === 'file') {
                    result.outcome = 'file-upload-unconfirmed';
                    continue;
                  }
                  const form = found.locator('xpath=ancestor::form[1]');
                  result.fieldIssues = await fillFields((await form.count()) ? form : currentScope);
                  result.outcome = 'field-interaction-observed';
                } else if (control.tag === 'select') {
                  const options = await found
                    .locator('option:not([disabled])')
                    .evaluateAll((els) => els.map((el) => el.value));
                  for (const value of options) await found.selectOption(value);
                  result.outcome = 'select-options-exercised';
                  result.options = options;
                } else {
                  const form = found.locator('xpath=ancestor::form[1]');
                  if (control.tag === 'button' && (await form.count()))
                    result.fieldIssues = await fillFields(form);
                  await found.click({ timeout: 2500 });
                  await session.page.waitForTimeout(100);
                  result.destination = session.page.url().replace(harness.origin, '');
                  result.outcome = 'click-observed';
                }
                result.requests = session.requests.slice(requests);
                result.alerts = await session.page
                  .locator('[role="alert"],.form-error,.activity-feed-error')
                  .allTextContents();
                if (
                  result.requests.some(
                    (request) => request.status === 'blocked-external' || request.status >= 400,
                  )
                )
                  result.outcome = 'real-boundary-blocked-unverified';
                else if (result.alerts.some((value) => value.trim()))
                  result.outcome = 'visible-error-or-validation';
                for (const popup of session.popups.splice(0)) await popup.close().catch(() => {});
              } catch (error) {
                result.outcome = 'interaction-failed';
                result.error = error.message.split('\n')[0];
              } finally {
                clearTimeout(watchdog);
                save();
                if (session.page.isClosed()) {
                  await session.context.close();
                  session = await harness.session('Public', 'individual', true);
                }
              }
            }
          } catch (error) {
            row.outcome = 'page-failed';
            row.error = error.message.split('\n')[0];
          }
          save();
          console.log(`Public ${path}: ${row.outcome}, ${row.controls?.length || 0} controls`);
        }
        report.errors.push(...session.errors);
      } finally {
        await session.context.close();
      }
    }),
  );
} finally {
  report.finished = new Date().toISOString();
  save();
  await harness.close();
}
