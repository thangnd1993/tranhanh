import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const officialUrl = 'https://www.csgt.vn/tra-cuu-phuong-tien-vi-pham.html';
const provider = {
  key: 'csgt-manual',
  name: 'Cục Cảnh sát giao thông — tra cứu vi phạm qua hình ảnh',
  official: true,
  url: officialUrl,
  automation: 'MANUAL_ONLY',
  status: 'DISABLED',
  geographicCoverage: 'Vietnam; test fixture coverage is not guaranteed.',
  supportedVehicleTypes: ['CAR', 'MOTORCYCLE', 'ELECTRIC_BICYCLE'],
  requiresCaptcha: true,
  requiresAuthentication: false,
  freshness: 'The source does not publish a machine-readable update guarantee.',
};
const requests = [];
const result = (plate, outcome) => ({
  outcome,
  queriedPlateMasked: plate.slice(0, 3) + '-***.00',
  vehicleType: 'CAR',
  provider,
  retrievedAt: '2026-09-16T08:00:00Z',
  limitations: [{ code: 'CAPTCHA_REQUIRED', message: 'Security code required.' }],
  results:
    outcome === 'RESULTS_AVAILABLE'
      ? [
          {
            fingerprint: 'a'.repeat(64),
            providerKey: provider.key,
            sourceUrl: officialUrl,
            violationTime: '2026-09-15T08:00:00+07:00',
            violationLocation: 'Synthetic test location',
            violationBehavior: 'Synthetic test behavior',
            detectingAuthority: 'Synthetic test authority',
            processingAuthority: null,
            status: 'UNKNOWN',
            providerStatusText: null,
            sourceUpdatedAt: null,
            publicReference: 'TEST-REFERENCE',
          },
        ]
      : [],
});
const fixture = createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/api/v1/traffic-fines/lookup') {
    res.writeHead(404).end('{}');
    return;
  }
  let raw = '';
  req.on('data', (chunk) => (raw += chunk));
  req.on('end', () => {
    const body = JSON.parse(raw);
    requests.push(body);
    res.setHeader('Content-Type', 'application/json');
    const plate = body.licensePlate;
    if (plate === 'bad' || plate.startsWith('94')) return res.writeHead(400).end('{}');
    if (plate.startsWith('93')) return res.writeHead(429).end('{}');
    if (plate.startsWith('97')) return res.writeHead(503).end('{}');
    const outcome = plate.startsWith('95')
      ? 'RESULTS_AVAILABLE'
      : plate.startsWith('96')
        ? 'UNSUPPORTED'
        : plate.startsWith('98')
          ? 'NO_MATCHING_RECORDS'
          : 'MANUAL_VERIFICATION_REQUIRED';
    res.end(JSON.stringify(result(plate, outcome)));
  });
});
fixture.listen(0, '127.0.0.1');
await once(fixture, 'listening');
const apiOrigin = `http://127.0.0.1:${fixture.address().port}`;
const origin = 'http://127.0.0.1:4186';
const publicOrigin = 'https://traffic.example.test';
const server = spawn(process.execPath, ['dist/web/server/server.mjs'], {
  cwd: new URL('../', import.meta.url),
  env: {
    ...process.env,
    PORT: '4186',
    API_ORIGIN: apiOrigin,
    PUBLIC_SITE_URL: publicOrigin,
    PUBLIC_ALLOW_INDEXING: 'true',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
server.stdout.on('data', (chunk) => (logs += chunk));
server.stderr.on('data', (chunk) => (logs += chunk));
const meta = (html, name) =>
  [...html.matchAll(/<meta\b([^>]*)>/g)]
    .map((match) => Object.fromEntries([...match[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map((item) => item.slice(1))))
    .find((tag) => tag.name === name || tag.property === name)?.content;
const links = (html, rel) =>
  [...html.matchAll(/<link\b([^>]*)>/g)]
    .map((match) => Object.fromEntries([...match[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map((item) => item.slice(1))))
    .filter((tag) => tag.rel === rel);
let browser;
try {
  for (let i = 0; i < 100 && !logs.includes('listening on'); i++) {
    if (server.exitCode !== null) throw new Error(logs);
    await delay(100);
  }
  assert.match(logs, /listening on/);
  for (const [path, h1, limitation] of [
    ['/vi/tra-cuu/phat-nguoi', 'Tra cứu phạt nguội', 'xác minh CAPTCHA'],
    ['/en/lookup/traffic-fines', 'Traffic Fine Lookup', 'CAPTCHA verification'],
  ]) {
    const response = await fetch(origin + path + '?utm_source=test');
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, new RegExp(`<h1[^>]*>${h1}</h1>`));
    assert.ok(html.includes(limitation));
    assert.equal(meta(html, 'robots'), 'index, follow');
    assert.equal(links(html, 'canonical')[0].href, publicOrigin + path);
    assert.equal(links(html, 'alternate').length, 2);
    const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) =>
      JSON.parse(m[1]),
    );
    assert.deepEqual(schemas.map((schema) => schema['@type']).sort(), ['BreadcrumbList', 'WebPage']);
    assert.doesNotMatch(html, /89Y-111\.11|89Y11111/);
    assert.doesNotMatch(JSON.stringify(schemas), /licensePlate|queriedPlate|89Y/);
  }
  const viHome = await (await fetch(origin + '/vi')).text();
  assert.ok(viHome.includes('href="/vi/tra-cuu/phat-nguoi"'));
  assert.ok(viHome.includes('href="/vi/tra-cuu/bien-so"'));
  assert.ok(viHome.includes('Tra cứu phạt nguội'));
  const staticSitemap = await (await fetch(origin + '/sitemap-static.xml')).text();
  assert.equal((staticSitemap.match(/<loc>/g) ?? []).length, 4);
  assert.ok(staticSitemap.includes(publicOrigin + '/vi/tra-cuu/phat-nguoi'));
  assert.ok(staticSitemap.includes(publicOrigin + '/en/lookup/traffic-fines'));
  assert.doesNotMatch(staticSitemap, /99Z|traffic-fines\/|phat-nguoi\//);

  if (process.env.PLAYWRIGHT_MODULE) {
    const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
    const context = await browser.newContext({ viewport: { width: 390, height: 900 }, colorScheme: 'light' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:'))
        errors.push(message.text());
    });
    await page.goto(origin + '/vi/tra-cuu/phat-nguoi', { waitUntil: 'networkidle' });
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
        `overflow ${width}`,
      );
      assert.equal(await page.locator('h1').count(), 1);
    }
    const plate = '89Y-111.11';
    await page.locator('#traffic-fine-plate').fill(plate);
    await page.locator('.lookup-form button').click();
    await page.waitForSelector('tn-traffic-fine-result');
    assert.equal(page.url(), origin + '/vi/tra-cuu/phat-nguoi');
    assert.equal(await page.locator('#traffic-fine-plate').inputValue(), '');
    assert.ok((await page.locator('tn-traffic-fine-result').textContent()).includes('Cần xác minh thủ công'));
    assert.equal((await page.locator(`a[href="${officialUrl}"][rel="noopener noreferrer"]`).count()) > 0, true);
    const clientState = await page.evaluate(() => ({
      title: document.title,
      head: document.head.innerHTML,
      html: document.documentElement.outerHTML,
      url: location.href,
      storage: JSON.stringify({ ...localStorage, ...sessionStorage }),
    }));
    for (const value of Object.values(clientState)) assert.ok(!value.includes(plate), value.slice(0, 120));
    assert.deepEqual(requests.at(-1), { licensePlate: plate, vehicleType: 'CAR' });
    for (const [testPlate, expected] of [
      ['98Z-000.00', 'Nguồn không trả về bản ghi phù hợp'],
      ['96Z-000.00', 'Loại phương tiện chưa được nguồn này hỗ trợ'],
      ['95Z-000.00', 'Synthetic test location'],
      ['93Z-000.00', 'quá nhiều lượt tra cứu'],
      ['97Z-000.00', 'không phản hồi'],
    ]) {
      await page.locator('#traffic-fine-plate').fill(testPlate);
      await page.locator('.lookup-form button').click();
      await page.waitForFunction(
        (text) => document.querySelector('.result-status')?.textContent?.includes(text),
        expected,
      );
    }
    await page.locator('#traffic-fine-plate').fill('bad');
    await page.locator('.lookup-form button').click();
    await page.waitForFunction(() => document.querySelector('.result-status')?.textContent?.includes('chưa hợp lệ'));
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('result-status')), true);
    for (const theme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: theme });
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(origin + '/vi/tra-cuu/phat-nguoi', { waitUntil: 'networkidle' });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (process.env.TRAFFIC_FINE_SCREENSHOTS) {
          await mkdir(process.env.TRAFFIC_FINE_SCREENSHOTS, { recursive: true });
          await page.screenshot({
            path: `${process.env.TRAFFIC_FINE_SCREENSHOTS}/${theme}-${width}.png`,
            fullPage: true,
          });
        }
      }
    }
    assert.deepEqual(errors, []);
    await context.close();
    console.log('Traffic Fine headless: privacy, outcomes, accessibility, 8 widths, light/dark passed.');
  }
  assert.doesNotMatch(logs, /uncaughtException|ERROR/);
  console.log('Traffic Fine SSR/SEO: bilingual pages, static metadata, homepage/nav and sitemap passed.');
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await once(server, 'exit');
  }
  fixture.close();
  await once(fixture, 'close');
}
