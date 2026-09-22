/** Run against the isolated fixture server; credentials stay in the temporary session file.
 * UI_TEST_MODULES points to a node_modules directory containing playwright and @axe-core/playwright.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const modules = process.env.UI_TEST_MODULES || resolve('node_modules');
const { chromium } = await import(pathToFileURL(resolve(modules, 'playwright/index.mjs')));
const { default: AxeBuilder } = await import(pathToFileURL(resolve(modules, '@axe-core/playwright/dist/index.mjs')));
const session = JSON.parse(await readFile(process.env.UI_TEST_SESSION || '/tmp/sky-house-ui-session.json', 'utf8'));
const base = 'http://localhost:3100';
const output = resolve('reports/mobile-ui');
await mkdir(`${output}/screenshots`, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
// Browser exercises only local routes. Never invoke sync, deletion or save APIs during visual review.
await context.route('**/api/**', route => {
  const request = route.request();
  if (request.method() !== 'GET' && !request.url().includes('/api/auth/')) return route.abort();
  return route.continue();
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(base + '/bookings');
assert(new URL(page.url()).pathname === '/login', 'Private routes require authentication');
await page.getByLabel('Username').fill(session.username);
await page.getByLabel('Password').fill(session.password);
await page.getByRole('button', { name: 'Sign in', exact: true }).click();
await page.waitForURL('**/bookings');
const routes = ['/', '/bookings', '/bookings/new', '/bookings/booking-1', '/guests', '/guests/guest-1', '/calendar', '/performance', '/annual', '/financials', '/pricing', '/channels', '/comps', '/comps/calendar', '/comps/pricing', '/insights', '/knowledge', '/admin', '/upload', '/login', '/dillon-beach-revenue-estimator'];
const results = [];
const startedAt = new Date().toISOString();
for (const width of (process.env.UI_TEST_INTERACTIONS_ONLY ? [] : [360, 390, 430, 1440])) {
  await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
  for (const route of routes) {
    const response = await page.goto(base + route, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const slug = route === '/' ? 'dashboard' : route.slice(1).replaceAll('/', '-');
    const metrics = await page.evaluate(() => ({
      viewport: window.innerWidth, document: document.documentElement.scrollWidth,
      heading: document.querySelector('h1')?.textContent,
      unnamedControls: [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(el => !el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).map(el => el.outerHTML.slice(0,150)),
      overlay: !!document.querySelector('[data-nextjs-dialog]'),
    }));
    let violations = [];
    if (width === 390) {
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      violations = axe.violations.map(v => ({ id: v.id, impact: v.impact, count: v.nodes.length, nodes: v.nodes.slice(0,4).map(n => ({target:n.target,summary:n.failureSummary})) }));
    }
    const screenshot = `screenshots/${slug}-${width}.png`;
    await page.screenshot({ path: `${output}/${screenshot}`, fullPage: width === 390 });
    results.push({ route, width, status: response.status(), ...metrics, violations, screenshot });
    console.log(`${width} ${route}: ${response.status()} overflow=${metrics.document > width} a11y=${width === 390 ? violations.length : 'not scanned'}`);
  }
}
if (results.length) await writeFile(`${output}/route-results.json`, JSON.stringify({ startedAt, results, errors }, null, 2));
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base + '/');
await page.getByRole('button', { name: 'Open navigation' }).click();
assert(await page.getByRole('dialog', { name: 'Navigation' }).isVisible());
await page.screenshot({path:`${output}/screenshots/navigation-390.png`});
await page.keyboard.press('Escape');
assert(await page.getByRole('button', { name: 'Open navigation' }).evaluate(e => e === document.activeElement));
await page.getByRole('button', { name: 'Open navigation' }).click();
await page.getByRole('dialog').getByRole('link', { name: 'Bookings', exact: true }).click();
await page.waitForURL('**/bookings');
assert(await page.getByRole('dialog').count() === 0);
await page.getByLabel('Search bookings').fill('Alex');
await page.getByRole('button', { name: 'Search', exact:true }).click();
await page.waitForURL('**q=Alex');
assert(await page.locator('.record-card').count() === 1);
await page.getByLabel('Sort bookings').selectOption('revenue');
await page.waitForURL('**sort=revenue');
assert(new URL(page.url()).searchParams.get('q') === 'Alex');
await page.getByRole('button', {name:'Clear filters'}).click();
await page.waitForURL('**/bookings');
assert(await page.locator('.record-card').count() === 6);
for (const [route, button, label] of [['/channels','Add channel','Channel details'],['/comps','Add Competitor','Competitor details'],['/knowledge','Add Entry','Knowledge entry']]) {
  await page.goto(base + route);
  await page.getByRole('button', { name: button, exact:true }).click();
  const dialog = page.getByRole('dialog', {name:label});
  assert(await dialog.isVisible());
  for(let i=0;i<24;i++) { await page.keyboard.press('Tab'); assert(await dialog.evaluate(e => e.contains(document.activeElement)), 'Focus stays inside dialog'); }
  await page.screenshot({path:`${output}/screenshots/${route.slice(1)}-dialog-390.png`});
  await page.keyboard.press('Escape');
  assert(await page.getByRole('button', {name:button,exact:true}).evaluate(e=>e===document.activeElement));
}
await page.goto(base+'/comps/calendar');
await page.getByRole('button', {name:/Edit Coastal Retreat 1,/}).first().focus();
await page.keyboard.press('Enter');
assert(await page.getByRole('dialog').isVisible());
await page.keyboard.press('Escape');
await page.getByRole('button',{name:'Add context',exact:true}).click();
assert(await page.getByRole('dialog',{name:'Add context'}).isVisible());
await page.keyboard.press('Escape');
await page.goto(base+'/financials');
await page.getByLabel('Property asset value').fill('4000000');
await page.reload();
assert(await page.getByLabel('Property asset value').inputValue()==='4000000');
await page.getByRole('button',{name:'Reset to defaults'}).click();
await page.goto(base+'/');
await page.getByText('View monthly data',{exact:true}).first().click();
assert(await page.locator('.chart-data[open] tbody tr').count()===12);
await page.goto(base+'/dillon-beach-revenue-estimator');
await page.getByLabel('First name').fill('Alex');
for(let i=0;i<3;i++) await page.getByRole('button',{name:'Continue',exact:true}).click();
await page.getByRole('button',{name:'Generate estimate',exact:true}).click();
assert(await page.locator('#estimate-report').isVisible());
await page.screenshot({path:`${output}/screenshots/estimator-result-390.png`,fullPage:true});
await writeFile(`${output}/interaction-results.json`,JSON.stringify({passed:['Private route redirects to login','Real credentials login','Drawer Escape and focus return','Drawer route navigation','Booking search, sorting, filter reset','Channel, competitor, knowledge modal focus containment and restoration','Keyboard pricing cell editor','Context dialog dismissal','Financial scenario persistence and reset','Accessible monthly chart table','Estimator complete flow'],errors},null,2));
await browser.close();
assert.equal(errors.length, 0, 'No browser runtime errors');
if (results.length) {
  assert(results.every(r => r.status === 200 && r.document <= r.width && !r.overlay), 'Routes load without page overflow or framework errors');
  assert(results.every(r => r.unnamedControls.length === 0), 'Every form control has an accessible name');
  assert(results.every(r => r.violations.length === 0), 'WCAG A/AA automated checks pass');
}
console.log('Mobile UI route and interaction checks passed.');
