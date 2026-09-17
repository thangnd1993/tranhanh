import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
const dataset = JSON.parse(await readFile(new URL('../../api/data/area-codes.json', import.meta.url), 'utf8'));
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
  oldCode: m.oldCode,
  newCode: m.newCode,
  effectiveDate: m.effectiveDate,
  source: source(m.referenceId),
});
const rows = dataset.codes.map((r) => {
  const locality = dataset.localities.find((l) => l.key === r.localityKey);
  const group = dataset.groups.find((g) => g.key === locality.groupKey);
  const replacement = dataset.migrations.find((m) => m.oldCode === r.code);
  return {
    code: r.code,
    currentCode: replacement?.newCode ?? r.code,
    status: r.status,
    locality: {
      key: locality.key,
      name: locality.name,
      aliases: locality.aliases,
      nameContext: 'TELECOM_SERVICE_AREA',
      source: source(locality.referenceId),
      group: {
        key: group.key,
        name: group.name,
        effectiveFrom: group.effectiveFrom,
        source: source(group.referenceId),
      },
    },
    resolution: 'GEOGRAPHIC_AREA_CODE',
    subscriberVerified: false,
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo,
    previousCodes: dataset.migrations.filter((m) => m.newCode === r.code).map(migration),
    replacement: replacement ? migration(replacement) : null,
    source: source(r.referenceId),
    importedAt: '2026-09-11T04:35:11Z',
    updatedAt: '2026-09-11T04:35:11Z',
  };
});
const phoneRow = {
  prefix: '999',
  currentPrefix: '999',
  status: 'ACTIVE',
  operator: { key: 'test', name: 'Test', website: null },
  operatorResolution: 'PREFIX_ALLOCATION',
  currentSubscriberNetworkVerified: false,
  effectiveFrom: null,
  effectiveTo: null,
  previousPrefixes: [],
  replacement: null,
  source: source(dataset.references[0].id),
  importedAt: '2026-09-11T04:35:11Z',
  updatedAt: '2026-09-11T04:35:11Z',
};
let mode = 'healthy';
let requests = 0;
const fold = (v) => v.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase();
const fixture = createServer((req, res) => {
  if (req.url?.startsWith('/api/v1/area-codes')) requests++;
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
  if (url.pathname === '/api/v1/phone-prefixes') {
    res.end(JSON.stringify({ items: [phoneRow], total: 1, page: 1, pageSize: 100 }));
    return;
  }
  if (!url.pathname.startsWith('/api/v1/area-codes')) {
    res.writeHead(404).end('{}');
    return;
  }
  const path = url.pathname.replace('/api/v1/area-codes', '');
  if (path === '' || path === '/search') {
    const q = fold(url.searchParams.get('q') ?? '');
    const found = q
      ? rows.filter((r) =>
          fold([r.code, r.locality.name, ...r.locality.aliases, r.locality.group.name].join(' ')).includes(
            q.replace(/^([1-9]\d{0,2})$/, '0$1'),
          ),
        )
      : rows;
    const page = Number(url.searchParams.get('page') ?? 1);
    const size = Number(url.searchParams.get('pageSize') ?? 20);
    res.end(
      JSON.stringify({ items: found.slice((page - 1) * size, page * size), total: found.length, page, pageSize: size }),
    );
    return;
  }
  let code = path.split('/')[1];
  if (path === '/lookup') {
    const raw = (url.searchParams.get('value') ?? '').replace(/[ -]/g, '');
    let domestic = raw.startsWith('+84')
      ? '0' + raw.slice(3)
      : raw.startsWith('0084')
        ? '0' + raw.slice(4)
        : raw.startsWith('84')
          ? '0' + raw.slice(2)
          : raw.startsWith('0')
            ? raw
            : '0' + raw;
    const active = rows.filter((r) => r.status === 'ACTIVE').sort((a, b) => b.code.length - a.code.length);
    code = /^0[1-9]\d{0,2}$/.test(domestic) ? domestic : active.find((r) => domestic.startsWith(r.code))?.code;
    if (!code) {
      res.writeHead(400).end('{}');
      return;
    }
  }
  const row = rows.find((r) => r.code === code);
  if (!row) {
    res.writeHead(404).end('{}');
    return;
  }
  res.end(
    JSON.stringify(
      path.endsWith('/related')
        ? rows
            .filter(
              (r) =>
                r.code !== row.code &&
                (r.locality.key === row.locality.key ||
                  (r.status === 'ACTIVE' && r.locality.group.key === row.locality.group.key)),
            )
            .slice(0, 20)
        : row,
    ),
  );
});
fixture.listen(0, '127.0.0.1');
await once(fixture, 'listening');
const apiOrigin = `http://127.0.0.1:${fixture.address().port}`;
const origin = 'http://127.0.0.1:4177';
const canonicalOrigin = 'https://area.example.test';
const server = spawn(process.execPath, ['dist/web/server/server.mjs'], {
  cwd: new URL('../', import.meta.url),
  env: {
    ...process.env,
    PORT: '4177',
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
  for (const [path, answer, h1, locality] of [
    ['/vi/tra-cuu/ma-vung/0236', 'Mã vùng 0236 được sử dụng cho khu vực Đà Nẵng.', '0236 là mã vùng ở đâu?', 'Đà Nẵng'],
    ['/en/lookup/area-code/0236', 'Area code 0236 is used for Đà Nẵng.', 'Where is area code 0236 used?', 'Đà Nẵng'],
    [
      '/vi/tra-cuu/ma-vung/0511',
      'Mã vùng cũ 0511 của khu vực Đà Nẵng đã đổi thành 0236.',
      'Mã vùng 0511 đổi thành mã nào?',
      'Đà Nẵng',
    ],
  ]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(answer));
    assert.ok(html.includes(h1));
    assert.ok(html.includes(locality));
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.match(html, new RegExp(`<html[^>]*lang="${path.startsWith('/vi') ? 'vi' : 'en'}"`));
    assert.ok(html.includes(`<title>${h1}`));
    assert.match(html, /name="description" content="[^"]+"/);
    assert.ok(html.includes(`rel="canonical" href="${canonicalOrigin + path}"`));
    for (const locale of ['vi', 'en']) assert.ok(html.includes(`hreflang="${locale}"`));
    assert.ok(html.includes('index, follow'));
    const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) =>
      JSON.parse(m[1]),
    );
    assert.ok(schemas.some((s) => s['@type'] === 'WebPage'));
    assert.equal(schemas.find((s) => s['@type'] === 'BreadcrumbList').itemListElement.length, 4);
  }
  const legacy = await fetch(origin + '/vi/tra-cuu/ma-vung/0511');
  assert.equal(legacy.url, origin + '/vi/tra-cuu/ma-vung/0511');
  for (const base of ['/vi/tra-cuu/ma-vung', '/en/lookup/area-code']) {
    const response = await fetch(origin + base);
    assert.equal(response.status, 200);
    const html = await response.text();
    for (const row of rows) assert.ok(html.includes(`${base}/${row.code}`));
  }
  for (const value of ['0999', 'abc', '123456789']) {
    const response = await fetch(`${origin}/vi/tra-cuu/ma-vung/${value}`);
    assert.equal(response.status, 404);
    const html = await response.text();
    assert.ok(html.includes('noindex'));
    assert.ok(!html.includes('rel="canonical"'));
    assert.ok(!html.includes('hreflang='));
  }
  assert.ok((await (await fetch(origin + '/vi/tra-cuu/ma-vung/0236?x=1')).text()).includes('noindex, follow'));
  const sitemap = await (await fetch(origin + '/sitemap-area-code.xml')).text();
  assert.equal((sitemap.match(/<loc>/g) ?? []).length, 246);
  for (const row of rows)
    for (const base of ['/vi/tra-cuu/ma-vung', '/en/lookup/area-code'])
      assert.ok(sitemap.includes(canonicalOrigin + base + '/' + row.code));
  for (const absent of ['0999', '?q=', '+84236']) assert.ok(!sitemap.includes(absent));
  const sitemapIndex = await (await fetch(origin + '/sitemap.xml')).text();
  assert.ok(sitemapIndex.includes('sitemap-area-code.xml'));
  assert.ok(sitemapIndex.includes('sitemap-phone-prefix.xml'));
  for (const state of ['unavailable', 'malformed']) {
    mode = state;
    const response = await fetch(origin + '/en/lookup/area-code/0236');
    assert.equal(response.status, 503);
    const html = await response.text();
    assert.ok(html.includes('temporarily unavailable'));
    assert.ok(html.includes('noindex'));
    assert.equal((await fetch(origin + '/sitemap-area-code.xml')).status, 503);
  }
  mode = 'healthy';
  console.log('Area raw SSR, localized metadata, 404/503 and 246 sitemap URLs passed (test API adapter).');
  if (process.env.PLAYWRIGHT_MODULE) {
    const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const before = requests;
    await page.goto(origin + '/vi/tra-cuu/ma-vung/0236');
    await page.waitForLoadState('networkidle');
    assert.equal(requests - before, 2, 'transfer state should avoid duplicate detail/related requests');
    for (const path of [
      '/vi/tra-cuu/ma-vung/0236',
      '/en/lookup/area-code/0236',
      '/vi/tra-cuu/ma-vung/0511',
      '/vi/tra-cuu/ma-vung',
      '/en/lookup/area-code',
      '/vi/tra-cuu/ma-vung/0999',
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
      }
    }
    if (process.env.AREA_SCREENSHOTS) await mkdir(process.env.AREA_SCREENSHOTS, { recursive: true });
    for (const theme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: theme });
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(origin + '/vi/tra-cuu/ma-vung/0236');
        await page.waitForLoadState('networkidle');
        const answer = await page.locator('.answer').boundingBox();
        assert.ok(answer.y + answer.height < 900);
        if (process.env.AREA_SCREENSHOTS)
          await page.screenshot({ path: `${process.env.AREA_SCREENSHOTS}/${theme}-${width}.png`, fullPage: true });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + '/vi/tra-cuu/ma-vung');
    await page.waitForLoadState('networkidle');
    await page.locator('#area-search').fill('Da Nang');
    await page.locator('.search-panel button').click();
    await page.waitForFunction(() => document.querySelector('.search-results'));
    assert.ok((await page.locator('.search-results').textContent()).includes('Đà Nẵng'));
    const number = '0236' + '1234567';
    await page.locator('#area-search').fill('+84' + number.slice(1));
    await page.locator('.search-panel button').click();
    await page.waitForURL('**/0236');
    assert.ok(!page.url().includes(number));
    assert.ok(!(await page.content()).includes(number));
    assert.ok(!(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).includes(number));
    assert.deepEqual(errors, []);
    await context.close();
    console.log('Headless: 8 widths × 6 routes; search privacy and light/dark passed.');
  }
} finally {
  await browser?.close();
  server.kill('SIGTERM');
  await once(server, 'exit');
  fixture.close();
  await once(fixture, 'close');
}
