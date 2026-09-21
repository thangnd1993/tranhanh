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
let documents = [
  {
    id: '55555555-5555-4555-8555-555555555555',
    vehicleId: vehicles[0].id,
    type: 'PERIODIC_INSPECTION',
    displayName: 'Đăng kiểm',
    referenceNumber: 'INSPECTION-PRIVATE-001',
    issuer: 'Trung tâm đăng kiểm',
    issuedAt: '2026-01-01',
    effectiveFrom: '2026-01-01',
    expiresAt: '2026-09-10',
    notes: 'User-provided',
    verificationStatus: 'USER_PROVIDED',
    status: 'ACTIVE',
    expiryState: 'EXPIRED',
    daysUntilExpiry: -7,
    reminders: [30, 15, 7, 1].map((daysBefore, index) => ({
      id: 'reminder-' + index,
      daysBefore,
      enabled: daysBefore === 7,
      scheduledFor: null,
      lastTriggeredForExpiry: null,
    })),
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
    const documentMatch = path.match(
      /^\/api\/v1\/vehicles\/([0-9a-f-]+)\/documents(?:\/([0-9a-f-]+))?(?:\/(restore|reminders))?$/,
    );
    if (documentMatch) {
      const vehicle = vehicles.find((v) => v.id === documentMatch[1]);
      if (!vehicle) {
        res.statusCode = 404;
        res.end('{}');
        return;
      }
      if (!documentMatch[2] && req.method === 'GET') {
        const items = documents.filter((d) => d.vehicleId === vehicle.id && d.status === 'ACTIVE');
        res.end(
          JSON.stringify({
            items,
            attention: {
              expired: items.filter((d) => d.expiryState === 'EXPIRED').length,
              expiringSoon: items.filter((d) => d.expiryState === 'EXPIRING_SOON').length,
              nextExpiry: null,
            },
          }),
        );
        return;
      }
      if (!documentMatch[2] && req.method === 'POST') {
        const input = await body(req);
        const row = {
          ...documents[0],
          ...input,
          id: '66666666-6666-4666-8666-666666666666',
          vehicleId: vehicle.id,
          referenceNumber: input.referenceNumber || null,
          expiryState: 'VALID',
          daysUntilExpiry: 365,
          reminders: [30, 15, 7, 1].map((daysBefore, index) => ({
            id: 'new-reminder-' + index,
            daysBefore,
            enabled: (input.reminderDaysBefore || []).includes(daysBefore),
            scheduledFor: null,
            lastTriggeredForExpiry: null,
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        documents.push(row);
        res.end(JSON.stringify(row));
        return;
      }
      const row = documents.find((d) => d.id === documentMatch[2] && d.vehicleId === vehicle.id);
      if (!row) {
        res.statusCode = 404;
        res.end('{}');
        return;
      }
      if (req.method === 'GET') {
        res.end(JSON.stringify(row));
        return;
      }
      if (req.method === 'PATCH') {
        Object.assign(row, await body(req), { updatedAt: new Date().toISOString() });
        res.end(JSON.stringify(row));
        return;
      }
      if (req.method === 'DELETE') {
        Object.assign(row, { status: 'ARCHIVED', archivedAt: new Date().toISOString() });
        res.end(JSON.stringify(row));
        return;
      }
      if (documentMatch[3] === 'restore' && req.method === 'POST') {
        Object.assign(row, { status: 'ACTIVE', archivedAt: null });
        res.end(JSON.stringify(row));
        return;
      }
      if (documentMatch[3] === 'reminders' && req.method === 'PUT') {
        res.end(JSON.stringify(row));
        return;
      }
    }
    const maintenanceMatch = path.match(/^\/api\/v1\/vehicles\/([0-9a-f-]+)\/maintenance\/summary$/);
    if (maintenanceMatch && req.method === 'GET') {
      const vehicle = vehicles.find((v) => v.id === maintenanceMatch[1]);
      if (!vehicle) {
        res.statusCode = 404;
        res.end('{}');
        return;
      }
      res.end(
        JSON.stringify({
          activeHistoryCount: 0,
          totalCostVnd: '0',
          unknownCostHistoryCount: 0,
          duePlanCount: 0,
          dueSoonPlanCount: 0,
        }),
      );
      return;
    }
    const fuelLogSummaryMatch = path.match(/^\/api\/v1\/vehicles\/([0-9a-f-]+)\/fuel-logs\/summary$/);
    if (fuelLogSummaryMatch && req.method === 'GET') {
      const vehicle = vehicles.find((v) => v.id === fuelLogSummaryMatch[1]);
      if (!vehicle) {
        res.statusCode = 404;
        res.end('{}');
        return;
      }
      res.end(
        JSON.stringify({
          latestRefueledAt: null,
          totalCostVnd: '0',
          averageLitersPer100Km: null,
        }),
      );
      return;
    }
    const monitoringMatch = path.match(
      /^\/api\/v1\/vehicles\/([0-9a-f-]+)\/monitoring(?:\/(history|enable|disable))?$/,
    );
    if (monitoringMatch) {
      const vehicle = vehicles.find((v) => v.id === monitoringMatch[1]);
      if (!vehicle) {
        res.statusCode = 404;
        res.end('{}');
        return;
      }
      if (monitoringMatch[2] === 'history' && req.method === 'GET') {
        res.end(JSON.stringify({ items: [] }));
        return;
      }
      const enabled = monitoringMatch[2] === 'enable' ? true : monitoringMatch[2] === 'disable' ? false : false;
      res.end(
        JSON.stringify({
          id: '44444444-4444-4444-8444-444444444444',
          vehicleId: vehicle.id,
          monitoringType: 'TRAFFIC_FINE',
          providerKey: 'csgt-manual',
          providerName: 'Cục Cảnh sát giao thông',
          providerUrl: 'https://www.csgt.vn/tra-cuu-phuong-tien-vi-pham.html',
          enabled,
          effectiveStatus: enabled ? 'ENABLED_BUT_MANUAL' : 'DISABLED',
          capability: 'MANUAL_ONLY',
          automaticChecksAvailable: false,
          limitationCode: enabled ? 'MANUAL_VERIFICATION_REQUIRED' : null,
          lastAttemptAt: null,
          lastSuccessfulCheckAt: null,
          nextEligibleCheckAt: null,
          lastOutcome: null,
          failureCount: 0,
          updatedAt: new Date().toISOString(),
        }),
      );
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
  await page.getByText('51K-987.65').click();
  await page.getByRole('heading', { name: 'Theo dõi phạt nguội' }).waitFor();
  assert.match(await page.textContent('body'), /Theo dõi tự động chưa khả dụng|Chưa có lượt kiểm tra tự động/);
  await page.getByRole('link', { name: 'Quản lý giấy tờ' }).click();
  await page.waitForURL('**/vi/garage/22222222-2222-4222-8222-222222222222/giay-to');
  await page.locator('.documents-page h1').waitFor();
  assert.match(await page.textContent('body'), /Đăng kiểm|Đã hết hạn/);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `documents ${width}`,
    );
  }
  const shots = process.env.GARAGE_SCREENSHOTS;
  if (shots) {
    await mkdir(shots, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: join(shots, 'vehicle-documents-mobile-light.png'), fullPage: true });
  }
  await page.getByRole('link', { name: 'Thêm giấy tờ' }).first().click();
  await page.getByLabel('Tên hiển thị').fill('Bảo hiểm bắt buộc');
  await page.getByLabel('Số giấy tờ').fill('PRIVATE-POLICY-001');
  await page.getByLabel('Ngày hết hạn').fill('2027-09-17');
  await page.getByLabel(/7 ngày/).check();
  await page.getByRole('button', { name: 'Lưu giấy tờ' }).click();
  await page.waitForURL(
    '**/vi/garage/22222222-2222-4222-8222-222222222222/giay-to/66666666-6666-4666-8666-666666666666',
  );
  await page.getByText('Bảo hiểm bắt buộc').waitFor();
  if (shots) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'));
    await page.screenshot({ path: join(shots, 'vehicle-document-detail-desktop-dark.png'), fullPage: true });
  }
  await page.goto(origin + '/vi/garage/22222222-2222-4222-8222-222222222222', { waitUntil: 'networkidle' });
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `garage ${width}`,
    );
  }
  if (shots) {
    await mkdir(shots, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: join(shots, 'garage-monitoring-mobile-light.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'));
    await page.screenshot({ path: join(shots, 'garage-monitoring-desktop-dark.png'), fullPage: true });
  }
  await page.getByRole('link', { name: /Quay lại gara/ }).click();
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
  console.log(
    'Garage browser: auth, documents/reminders, monitoring, CRUD, privacy, sitemap, widths and screenshots passed.',
  );
} finally {
  await context?.close();
  await browser?.close();
  if (web.exitCode === null) {
    web.kill('SIGTERM');
    await once(web, 'exit');
  }
  await new Promise((resolve) => api.close(resolve));
}
