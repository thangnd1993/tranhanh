import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const apiPort = process.env.AUTH_API_PORT ?? '4381';
const webPort = process.env.AUTH_WEB_PORT ?? '4380';
const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'driver@example.com',
  displayName: 'Driver',
  status: 'ACTIVE',
  createdAt: '2026-09-16T00:00:00.000Z',
};
const api = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/api/v1/auth/me' && req.method === 'GET') {
    if (req.headers.cookie?.includes('tn_access=')) {
      res.end(JSON.stringify(user));
    } else {
      res.statusCode = 401;
      res.end(JSON.stringify({ statusCode: 401 }));
    }
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
  if (req.url === '/api/v1/auth/register' && req.method === 'POST') {
    res.setHeader('set-cookie', [
      'tn_access=fake-access; Path=/api/v1; HttpOnly; SameSite=Strict',
      'tn_refresh=fake-refresh; Path=/api/v1/auth; HttpOnly; SameSite=Strict',
      'tn_csrf=fake-csrf; Path=/; SameSite=Strict',
    ]);
    res.end(JSON.stringify({ user, accessExpiresAt: '2026-09-16T01:00:00.000Z' }));
    return;
  }
  if (req.url === '/api/v1/auth/logout' && req.method === 'POST') {
    res.setHeader('set-cookie', [
      'tn_access=; Path=/api/v1; Max-Age=0',
      'tn_refresh=; Path=/api/v1/auth; Max-Age=0',
      'tn_csrf=; Path=/; Max-Age=0',
    ]);
    res.end(JSON.stringify({ message: 'Signed out.' }));
    return;
  }
  if (req.url === '/api/v1/auth/forgot-password' && req.method === 'POST') {
    res.end(JSON.stringify({ message: 'generic' }));
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ statusCode: 404 }));
});
await new Promise((resolve, reject) => api.listen(Number(apiPort), '127.0.0.1', resolve).once('error', reject));
const web = spawn(process.execPath, ['dist/web/server/server.mjs'], {
  cwd: new URL('../', import.meta.url),
  env: {
    ...process.env,
    PORT: webPort,
    API_ORIGIN: `http://127.0.0.1:${apiPort}`,
    PUBLIC_SITE_URL: 'https://auth.example.test',
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
  assert.match(logs, /listening on/);
  const origin = `http://127.0.0.1:${webPort}`;
  for (const [path, text] of [
    ['/vi', 'Trợ lý cho tài xế'],
    ['/en', 'An assistant for drivers'],
    ['/vi/dang-nhap', 'Chào mừng bạn quay lại'],
    ['/en/login', 'Welcome back'],
    ['/vi/dang-ky', 'Tạo tài khoản'],
    ['/en/register', 'Create an account'],
  ]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.ok(html.includes(text), path);
    assert.match(html, /name="robots" content="noindex, nofollow"|<h1/);
    assert.doesNotMatch(html, /fake-access|fake-refresh|correct horse|driver@example\.com/);
    if (path.includes('dang-') || path.includes('/login') || path.includes('/register'))
      assert.match(html, /noindex, nofollow/);
  }
  for (const cookie of ['', 'tn_access=private-secret; tn_refresh=private-refresh']) {
    const html = await (await fetch(origin + '/vi/tai-khoan', { headers: cookie ? { cookie } : {} })).text();
    assert.doesNotMatch(html, /private-secret|private-refresh|driver@example\.com/);
  }
  if (process.env.PLAYWRIGHT_MODULE) {
    const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
    context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('status of 401')) errors.push(m.text());
    });
    for (const path of ['/vi/dang-nhap', '/en/register'])
      for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(origin + path, { waitUntil: 'networkidle' });
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
          `${path} ${width}`,
        );
      }
    await page.goto(origin + '/vi/dang-nhap', { waitUntil: 'networkidle' });
    await page.locator('#login-email').fill('driver@example.com');
    await page.locator('#login-password').fill('correct horse battery staple');
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/vi/tai-khoan');
    assert.match(await page.locator('h1').textContent(), /Tài khoản/);
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
        `account ${width}`,
      );
    }
    await page.locator('#theme-preference').selectOption('dark');
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    const storage = await page.evaluate(() => ({
      local: Object.values(localStorage),
      session: Object.values(sessionStorage),
    }));
    assert.ok(storage.local.every((value) => ['vi', 'en', 'system', 'light', 'dark'].includes(value)));
    assert.deepEqual(storage.session, []);
    assert.doesNotMatch(await page.content(), /fake-access|fake-refresh/);
    if (process.env.AUTH_SCREENSHOTS) {
      await mkdir(process.env.AUTH_SCREENSHOTS, { recursive: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: join(process.env.AUTH_SCREENSHOTS, 'auth-mobile.png') });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({ path: join(process.env.AUTH_SCREENSHOTS, 'auth-desktop.png') });
    }
    assert.deepEqual(errors, []);
    console.log('Auth browser: login/account, light-dark, security and 8 responsive widths passed.');
  }
  console.log('Auth SSR: localized noindex pages, anonymous isolation and secret-free HTML passed.');
} finally {
  await context?.close();
  await browser?.close();
  if (web.exitCode === null) {
    web.kill('SIGTERM');
    await once(web, 'exit');
  }
  await new Promise((resolve) => api.close(resolve));
}
