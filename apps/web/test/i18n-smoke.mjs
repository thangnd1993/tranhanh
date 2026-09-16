import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// Run after the production build. Browser QA is opt-in via PLAYWRIGHT_MODULE.
const port = process.env['I18N_TEST_PORT'] ?? '4173';
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['dist/web/server/server.mjs'], {
  cwd: new URL('../', import.meta.url),
  env: { ...process.env, PORT: port },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
server.stdout.on('data', (chunk) => {
  logs += chunk;
});
server.stderr.on('data', (chunk) => {
  logs += chunk;
});
let browser;
let context;
const screenshots = process.env['I18N_SCREENSHOTS'];
let temporary;
try {
  for (let attempt = 0; attempt < 100 && !logs.includes('listening on'); attempt++) {
    if (server.exitCode !== null) throw new Error(logs);
    await delay(100);
  }
  assert.match(logs, /listening on/);
  for (const [path, target] of [
    ['/', '/vi'],
    ['/design-system', '/vi/design-system'],
  ]) {
    const response = await fetch(origin + path, { redirect: 'manual' });
    assert.ok([301, 302, 307, 308].includes(response.status), `${path}: ${response.status}`);
    assert.equal(new URL(response.headers.get('location'), origin).pathname, target);
  }
  for (const path of ['/fr', '/abc', '/vi/unknown', '/en/unknown']) {
    assert.equal((await fetch(origin + path, { redirect: 'manual' })).status, 404, path);
  }
  for (const locale of ['vi', 'en']) {
    for (const suffix of ['', '/design-system']) {
      const response = await fetch(`${origin}/${locale}${suffix}`);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, new RegExp(`<html[^>]*lang="${locale}"`));
      assert.ok(
        html.includes(
          locale === 'vi' ? 'Trợ lý cho tài xế &amp; phương tiện' : 'An assistant for drivers &amp; vehicles',
        ),
      );
      assert.ok(html.includes(locale === 'vi' ? 'Chuyển ngôn ngữ' : 'Switch language'));
      if (suffix) {
        assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
        assert.match(html, /name="robots" content="noindex, nofollow"/);
        assert.ok(html.includes(locale === 'vi' ? 'Bộ giao diện TraNhanh' : 'TraNhanh design system'));
      }
    }
  }
  console.log('SSR: redirects, both locales, initial HTML language/content and showcase noindex passed.');
  if (process.env['PLAYWRIGHT_MODULE']) {
    const { chromium } = await import(process.env['PLAYWRIGHT_MODULE']);
    browser = await chromium.launch({ headless: true, executablePath: process.env['CHROME_EXECUTABLE'] });
    context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(`${origin}/vi`);
    await page.evaluate(() => localStorage.setItem('tranhanh.locale', 'en'));
    await page.reload();
    await page.waitForFunction(() => document.documentElement.lang === 'vi');
    await page.evaluate(() => localStorage.setItem('tranhanh.locale', 'vi'));
    await page.goto(`${origin}/en/design-system?demo=1#forms-title`);
    await page.waitForFunction(() => document.documentElement.lang === 'en');
    await page.setViewportSize({ width: 1440, height: 900 });
    const desktopSwitch = page.locator('#language-desktop button[lang="vi"]');
    await desktopSwitch.focus();
    await desktopSwitch.press('Enter');
    await page.waitForURL('**/vi/design-system?demo=1#forms-title');
    await page.waitForFunction(() => localStorage.getItem('tranhanh.locale') === 'vi');
    await page.goBack();
    await page.waitForFunction(() => document.documentElement.lang === 'en');
    await page.setViewportSize({ width: 390, height: 844 });
    const menu = page.locator('.menu-toggle');
    await menu.focus();
    await menu.press('Enter');
    await page.waitForFunction(() => document.querySelector('.menu-toggle').getAttribute('aria-expanded') === 'true');
    await page.locator('#language-mobile button[lang="vi"]').focus();
    await page.locator('#language-mobile button[lang="vi"]').press('Enter');
    await page.waitForURL('**/vi/design-system?demo=1#forms-title');
    for (const locale of ['vi', 'en']) {
      for (const suffix of ['', '/design-system']) {
        await page.goto(`${origin}/${locale}${suffix}`, { waitUntil: 'networkidle' });
        for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
            false,
            `overflow: ${locale}${suffix} at ${width}`,
          );
        }
        const unnamed = await page
          .locator('button, input, select')
          .evaluateAll(
            (elements) =>
              elements.filter((el) => !el.getAttribute('aria-label') && !el.textContent.trim() && !el.labels?.length)
                .length,
          );
        assert.equal(unnamed, 0, `unnamed controls: ${locale}${suffix}`);
      }
    }
    await page.locator('#theme-preference').selectOption('dark');
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    if (screenshots) {
      temporary = await mkdtemp(join(tmpdir(), 'tranhanh-i18n-'));
      await page.goto(`${origin}/en`, { waitUntil: 'networkidle' });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({ path: join(temporary, 'en-desktop.png') });
      await page.locator('#theme-preference').selectOption('light');
      await page.goto(`${origin}/vi`, { waitUntil: 'networkidle' });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('.menu-toggle').click();
      await page.waitForFunction(() => document.querySelector('.menu-toggle').getAttribute('aria-expanded') === 'true');
      await page.screenshot({ path: join(temporary, 'vi-mobile.png') });
      console.log(`Review screenshots, then remove temporary directory: ${temporary}`);
    }
    assert.deepEqual(errors, [], 'Browser/hydration console errors');
    console.log('Browser: keyboard switching, persistence, URL priority, history, labels, theme and 8 widths passed.');
  }
  assert.doesNotMatch(logs, /ERROR|uncaughtException/);
} finally {
  await context?.close();
  await browser?.close();
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await once(server, 'exit');
  }
  if (temporary && !screenshots) await rm(temporary, { recursive: true });
}
