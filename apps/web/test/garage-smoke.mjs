import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
const apiPort = process.env.GARAGE_API_PORT ?? '4391',
  webPort = process.env.GARAGE_WEB_PORT ?? '4390';
const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'driver@example.com',
  displayName: 'Driver',
  status: 'ACTIVE',
  createdAt: '2026-09-16T00:00:00.000Z',
};
let vehicles = [
  {
    id: '22222222-2222-4222-8222-222222222222',
    displayName: 'Xe gia đình',
    licensePlate: '51K-987.65',
    vehicleType: 'CAR',
    make: 'Toyota',
    model: 'Vios',
    modelYear: 2024,
    currentOdometerKm: 12000,
    notes: 'Private note',
    isPrimary: true,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: '2026-09-16T00:00:00.000Z',
    updatedAt: '2026-09-16T00:00:00.000Z',
  },
];
async function body(req) {
  let value = '';
  for await (const part of req) value += part;
  return value ? JSON.parse(value) : {};
}
const api = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  const authenticated = req.headers.cookie?.includes('tn_access=');
  if (req.url === '/api/v1/auth/me' && req.method === 'GET') {
    if (!authenticated) {
      res.statusCode = 401;
      res.end('{}');
    } else res.end(JSON.stringify(user));
    return;
  }
  if (req.url === '/api/v1/auth/login' && req.method === 'POST') {
    res.setHeader('set-cookie', [
      'tn_access=fake-access; Path=/api/v1; HttpOnly; SameSite=Strict',
      'tn_refresh=fake-refresh; Path=/api/v1/auth; HttpOnly; SameSite=Strict',
      'tn_csrf=fake-csrf; Path=/; SameSite=Strict',
    ]);
    res.end(JSON.stringify({ user, accessExpiresAt: '2026-09-16T01:00:00.000Z' }));
    return;
  }
  if (req.url?.startsWith('/api/v1/vehicles')) {
    if (!authenticated) {
      res.statusCode = 401;
      res.end('{}');
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method ?? '') && req.headers['x-csrf-token'] !== 'fake-csrf') {
      res.statusCode = 403;
      res.end('{}');
      return;
    }
    const path = req.url.split('?')[0];
    if (path === '/api/v1/vehicles' && req.method === 'GET') {
      res.end(JSON.stringify(vehicles));
      return;
    }
    if (path === '/api/v1/vehicles' && req.method === 'POST') {
      const input = await body(req);
      const row = {
        ...vehicles[0],
        ...input,
        id: '33333333-3333-4333-8333-333333333333',
        displayName: input.displayName || input.licensePlate,
        licensePlate: input.licensePlate.toUpperCase(),
        isPrimary: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      vehicles.push(row);
      res.end(JSON.stringify(row));
      return;
    }
    const match = path.match(/^\/api\/v1\/vehicles\/([0-9a-f-]+)$/);
    if (match && req.method === 'GET') {
      const row = vehicles.find((v) => v.id === match[1]);
      if (!row) {
        res.statusCode = 404;
        res.end('{}');
      } else res.end(JSON.stringify(row));
      return;
    }
    if (match && req.method === 'PATCH') {
      const input = await body(req);
      const row = vehicles.find((v) => v.id === match[1]);
      Object.assign(row, input, { updatedAt: new Date().toISOString() });
      res.end(JSON.stringify(row));
      return;
    }
  }
  res.statusCode = 404;
  res.end('{}');
});
await new Promise((resolve, reject) => api.listen(Number(apiPort), '127.0.0.1', resolve).once('error', reject));
const web = spawn(process.execPath, ['dist/web/server/server.mjs'], {
  cwd: new URL('../', import.meta.url),
  env: {
    ...process.env,
    PORT: webPort,
    API_ORIGIN: `http://127.0.0.1:${apiPort}`,
    PUBLIC_SITE_URL: 'https://garage.example.test',
    PUBLIC_ALLOW_INDEXING: 'true',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
web.stdout.on('data', (c) => (logs += c));
web.stderr.on('data', (c) => (logs += c));
let browser, context;
try {
  for (let i = 0; i < 100 && !logs.includes('listening on'); i++) {
    if (web.exitCode !== null) throw new Error(logs);
    await delay(100);
  }
  const origin = `http://127.0.0.1:${webPort}`;
  for (const path of [
    '/vi/garage',
    '/en/garage',
    '/vi/garage/them-xe',
    '/en/garage/add',
    '/vi/garage/22222222-2222-4222-8222-222222222222',
  ]) {
    const response = await fetch(origin + path, { headers: { cookie: 'tn_access=private-server-secret' } });
    const html = await response.text();
    assert.equal(response.status, 200, path);
    assert.match(html, /noindex, nofollow/, path);
    assert.doesNotMatch(html, /51K-987\.65|Private note|private-server-secret|driver@example\.com/, path);
  }
  const sitemap = await (await fetch(origin + '/sitemap-static.xml')).text();
  assert.doesNotMatch(sitemap, /\/(?:vi|en)\/garage|them-xe/);
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
  context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('status of 401')) errors.push(m.text());
  });
  await page.goto(origin + '/vi/garage', { waitUntil: 'networkidle' });
  await page.waitForURL('**/vi/dang-nhap**');
  assert.equal(new URL(page.url()).searchParams.get('returnTo'), '/vi/garage');
  await page.locator('#login-email').fill('driver@example.com');
  await page.locator('#login-password').fill('correct horse battery staple');
  await page.locator('button[type=submit]').click();
  await page.waitForURL('**/vi/garage');
  await page.getByText('51K-987.65').waitFor();
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `garage ${width}`,
    );
  }
  const shots = process.env.GARAGE_SCREENSHOTS;
  if (shots) {
    await mkdir(shots, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: join(shots, 'garage-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: join(shots, 'garage-desktop.png'), fullPage: true });
  }
  await page.getByRole('link', { name: 'Thêm xe' }).first().click();
  await page.getByLabel('Biển số xe').fill('30A-456.78');
  await page.getByLabel('Tên gợi nhớ').fill('Xe đi làm');
  await page.getByLabel('Hãng xe').fill('Honda');
  await page.getByRole('button', { name: 'Lưu phương tiện' }).click();
  await page.waitForURL('**/vi/garage/33333333-3333-4333-8333-333333333333');
  await page.getByText('30A-456.78').waitFor();
  await page.getByRole('link', { name: 'Chỉnh sửa' }).click();
  await page.getByLabel('Tên gợi nhớ').fill('Xe đi làm hằng ngày');
  await page.getByRole('button', { name: 'Lưu phương tiện' }).click();
  await page.getByText('Xe đi làm hằng ngày').waitFor();
  const storage = await page.evaluate(() => ({
    local: Object.values(localStorage),
    session: Object.values(sessionStorage),
  }));
  assert.ok(storage.local.every((v) => ['vi', 'en', 'system', 'light', 'dark'].includes(v)));
  assert.deepEqual(storage.session, []);
  assert.doesNotMatch(await page.content(), /fake-access|fake-refresh/);
  assert.deepEqual(errors, []);
  console.log('Garage browser: auth, list/create/detail/edit, privacy, sitemap, 8 widths and screenshots passed.');
} finally {
  await context?.close();
  await browser?.close();
  if (web.exitCode === null) {
    web.kill('SIGTERM');
    await once(web, 'exit');
  }
  await new Promise((resolve) => api.close(resolve));
}
