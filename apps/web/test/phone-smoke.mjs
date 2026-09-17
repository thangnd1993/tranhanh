import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { normalizePhone } from '../../api/dist/phone-prefixes/normalize-phone.js';

// TEST ONLY: adapt the reviewed backend fixture to its public contract. Never imported by production.
const dataset = JSON.parse(await readFile(new URL('../../api/data/phone-prefixes.json', import.meta.url), 'utf8'));
function source(id) {
  const ref = dataset.references.find((r) => r.id === id);
  const publisher = dataset.sources.find((s) => s.key === ref.sourceKey);
  return {
    publisher: publisher.name,
    official: publisher.isOfficial,
    publisherUrl: publisher.homepageUrl,
    title: ref.title,
    url: ref.url,
    publishedAt: ref.publishedAt,
    retrievedAt: ref.retrievedAt,
  };
}
const migration = (m) => ({
  oldPrefix: m.oldPrefix,
  newPrefix: m.newPrefix,
  effectiveAt: m.effectiveAt,
  source: source(m.referenceId),
});
const rows = dataset.prefixes.map((r) => {
  const op = dataset.operators.find((o) => o.key === r.operatorKey);
  const replacement = dataset.migrations.find((m) => m.oldPrefix === r.prefix);
  return {
    prefix: r.prefix,
    currentPrefix: replacement?.newPrefix ?? r.prefix,
    status: r.status,
    operator: { key: op.key, name: op.name, website: op.website },
    operatorResolution: 'PREFIX_ALLOCATION',
    currentSubscriberNetworkVerified: false,
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo,
    previousPrefixes: dataset.migrations.filter((m) => m.newPrefix === r.prefix).map(migration),
    replacement: replacement ? migration(replacement) : null,
    source: source(r.referenceId),
    importedAt: '2026-09-11T03:00:00Z',
    updatedAt: '2026-09-11T03:00:00Z',
  };
});
let mode = 'healthy';
let requests = 0;
const fixture = createServer((req, res) => {
  if (req.url?.startsWith('/api/v1/phone-prefixes')) requests++;
  res.setHeader('Content-Type', 'application/json');
  if (mode === 'unavailable') {
    res.writeHead(503).end('{}');
    return;
  }
  if (mode === 'malformed') {
    res.end('{}');
    return;
  }
  const url = new URL(req.url, 'http://fixture.test');
  const path = url.pathname.replace('/api/v1/phone-prefixes', '');
  if (path === '') {
    res.end(JSON.stringify({ items: rows, total: rows.length, page: 1, pageSize: 100 }));
    return;
  }
  let prefix = path.split('/')[1];
  if (path === '/lookup') {
    try {
      prefix = normalizePhone(url.searchParams.get('value') ?? '').prefix;
    } catch {
      res.writeHead(400).end('{}');
      return;
    }
  }
  const row = rows.find((r) => r.prefix === prefix);
  if (!row) {
    res.writeHead(404).end('{}');
    return;
  }
  res.end(
    JSON.stringify(
      path.endsWith('/related')
        ? rows
            .filter((r) => r.operator.key === row.operator.key && r.status === 'ACTIVE' && r.prefix !== row.prefix)
            .slice(0, 12)
        : row,
    ),
  );
});
fixture.listen(0, '127.0.0.1');
await once(fixture, 'listening');
const apiOrigin = `http://127.0.0.1:${fixture.address().port}`;
const origin = 'http://127.0.0.1:4176';
const canonicalOrigin = 'https://phone.example.test';
const server = spawn(process.execPath, ['dist/web/server/server.mjs'], {
  cwd: new URL('../', import.meta.url),
  env: {
    ...process.env,
    PORT: '4176',
    API_ORIGIN: apiOrigin,
    PUBLIC_SITE_URL: canonicalOrigin,
    PUBLIC_ALLOW_INDEXING: 'true',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
server.stdout.on('data', (v) => (logs += v));
server.stderr.on('data', (v) => (logs += v));
let browser;
try {
  for (let i = 0; i < 100 && !logs.includes('listening on'); i++) {
    if (server.exitCode !== null) throw new Error(logs);
    await delay(100);
  }
  assert.match(logs, /listening on/);
  for (const [path, answer, h1, publisher] of [
    ['/vi/tra-cuu/dau-so/086', 'Đầu số 086 được phân bổ cho Viettel.', '086 là mạng gì?', 'Viettel'],
    ['/en/lookup/phone-prefix/086', 'Prefix 086 is allocated to Viettel.', 'What network uses prefix 086?', 'Viettel'],
    ['/vi/tra-cuu/dau-so/0168', 'Đầu số 0168 đã được chuyển thành 038.', 'Đầu số 0168 đổi thành đầu số nào?', 'Bộ'],
    ['/en/lookup/phone-prefix/0168', 'Prefix 0168 was changed to 038.', 'What did prefix 0168 change to?', 'Bộ'],
  ]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200);
    const html = await response.text();
    const vi = path.startsWith('/vi');
    assert.ok(html.includes(answer));
    assert.ok(html.includes(h1));
    assert.ok(html.includes(publisher));
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.match(html, new RegExp(`<html[^>]*lang="${vi ? 'vi' : 'en'}"`));
    assert.ok(html.includes(`<title>${h1}`));
    assert.match(html, /name="description" content="[^"]+"/);
    assert.ok(html.includes(`rel="canonical" href="${canonicalOrigin + path}"`));
    for (const locale of ['vi', 'en']) assert.ok(html.includes(`hreflang="${locale}"`));
    assert.ok(html.includes('index, follow'));
    assert.ok(html.includes('og:locale'));
    const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) =>
      JSON.parse(m[1]),
    );
    assert.ok(schemas.some((s) => s['@type'] === 'WebPage'));
    const crumbs = schemas.find((s) => s['@type'] === 'BreadcrumbList').itemListElement;
    assert.equal(crumbs.length, 4);
    assert.equal(crumbs[3].name, path.split('/').at(-1));
    assert.equal(crumbs[1].item, undefined); // No nonexistent lookup-parent link.
  }
  for (const base of ['/vi/tra-cuu/dau-so', '/en/lookup/phone-prefix']) {
    const response = await fetch(origin + base);
    assert.equal(response.status, 200);
    const html = await response.text();
    for (const row of rows) assert.ok(html.includes(`${base}/${row.prefix}`));
  }
  for (const value of ['999', 'abc', '123456789999']) {
    const response = await fetch(`${origin}/vi/tra-cuu/dau-so/${value}`);
    assert.equal(response.status, 404);
    const html = await response.text();
    assert.ok(html.includes('noindex'));
    assert.ok(!html.includes('rel="canonical"'));
    assert.ok(!html.includes('hreflang='));
  }
  const queried = await fetch(`${origin}/vi/tra-cuu/dau-so/086?filter=x`);
  assert.ok((await queried.text()).includes('noindex, follow'));
  const sitemap = await (await fetch(origin + '/sitemap-phone-prefix.xml')).text();
  assert.equal((sitemap.match(/<loc>/g) ?? []).length, 116);
  for (const row of rows)
    for (const base of ['/vi/tra-cuu/dau-so', '/en/lookup/phone-prefix'])
      assert.ok(sitemap.includes(canonicalOrigin + base + '/' + row.prefix));
  for (const absent of ['999', '?', 'design-system'])
    assert.ok(!sitemap.replace('<?xml version="1.0" encoding="UTF-8"?>', '').includes(absent));
  assert.ok((await (await fetch(origin + '/sitemap.xml')).text()).includes('sitemap-phone-prefix.xml'));
  for (const state of ['unavailable', 'malformed']) {
    mode = state;
    const response = await fetch(origin + '/en/lookup/phone-prefix/086');
    assert.equal(response.status, 503);
    const html = await response.text();
    assert.ok(html.includes('temporarily unavailable'));
    assert.ok(html.includes('noindex'));
    assert.ok(!html.includes('rel="canonical"'));
    assert.equal((await fetch(origin + '/sitemap-phone-prefix.xml')).status, 503);
    assert.ok(!(await (await fetch(origin + '/sitemap.xml')).text()).includes('sitemap-phone-prefix.xml'));
  }
  mode = 'healthy';
  console.log('Phone raw SSR, localized metadata, 404/503 and 116 sitemap URLs passed (test API adapter).');
  if (process.env.PLAYWRIGHT_MODULE) {
    const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const before = requests;
    await page.goto(origin + '/vi/tra-cuu/dau-so/086');
    await page.waitForLoadState('networkidle');
    assert.equal(requests - before, 2, 'SSR transfer should avoid duplicate detail/related API requests');
    for (const path of [
      '/vi/tra-cuu/dau-so/086',
      '/en/lookup/phone-prefix/086',
      '/vi/tra-cuu/dau-so/0168',
      '/vi/tra-cuu/dau-so',
      '/en/lookup/phone-prefix',
      '/vi/tra-cuu/dau-so/999',
    ]) {
      await page.goto(origin + path);
      await page.waitForLoadState('networkidle');
      for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `Overflow ${path} ${width}`,
        );
        assert.equal(await page.locator('h1').count(), 1);
        const chips = await page
          .locator('.chips a')
          .evaluateAll((links) => links.every((a) => a.getBoundingClientRect().height >= 44));
        assert.ok(chips);
      }
    }
    if (process.env.PHONE_SCREENSHOTS) await mkdir(process.env.PHONE_SCREENSHOTS, { recursive: true });
    for (const theme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: theme });
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(origin + '/vi/tra-cuu/dau-so/086');
        await page.waitForLoadState('networkidle');
        const answer = await page.locator('.answer').boundingBox();
        assert.ok(answer.y + answer.height < 900);
        if (process.env.PHONE_SCREENSHOTS)
          await page.screenshot({ path: `${process.env.PHONE_SCREENSHOTS}/${theme}-${width}.png`, fullPage: true });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + '/vi/tra-cuu/dau-so');
    await page.waitForLoadState('networkidle');
    const number = '086' + '1234567';
    for (const value of ['086', number, '+84' + number.slice(1), '0168']) {
      await page.locator('#phone-search').fill(value);
      await page.locator('.search-panel button').click();
      await page.waitForURL('**/' + (value === '0168' ? '0168' : '086'));
      await page.waitForLoadState('networkidle');
      assert.equal(await page.locator('#phone-search').inputValue(), '');
      assert.ok(!page.url().includes(number));
      assert.ok(!(await page.content()).includes(number));
      assert.ok(!(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).includes(number));
    }
    await page.locator('.menu-toggle').click();
    await page.locator('#language-mobile button[lang="en"]').click();
    await page.waitForURL('**/en/lookup/phone-prefix/0168');
    assert.ok((await page.locator('.answer').textContent()).includes('changed to 038'));
    for (const [value, text] of [
      ['abc', 'Check the format'],
      ['999', 'Check the prefix'],
    ]) {
      await page.locator('#phone-search').fill(value);
      await page.locator('.search-panel button').click();
      await page.waitForFunction((text) => document.querySelector('.field-error')?.textContent.includes(text), text);
    }
    assert.deepEqual(errors, []);
    await context.close();
    console.log('Headless: 8 widths × 6 routes; hydration, search privacy, locale switching, light/dark passed.');
  }
} finally {
  await browser?.close();
  server.kill('SIGTERM');
  await once(server, 'exit');
  fixture.close();
  await once(fixture, 'close');
}
