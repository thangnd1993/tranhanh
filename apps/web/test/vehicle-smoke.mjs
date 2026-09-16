import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { parseVehiclePlate } from '../../api/dist/vehicle-plates/normalize-vehicle-plate.js';
const dataset = JSON.parse(await readFile(new URL('../../api/data/vehicle-plates.json', import.meta.url), 'utf8'));
const source = (id) => {
  const r = dataset.references.find((r) => r.id === id),
    s = dataset.sources.find((s) => s.key === r.sourceKey);
  return {
    publisher: s.name,
    official: s.isOfficial,
    publisherUrl: s.homepageUrl,
    title: r.title,
    url: r.url,
    publishedAt: r.publishedAt,
    retrievedAt: r.retrievedAt,
  };
};
const target = (key) => {
  const t = dataset.targets.find((t) => t.key === key);
  return {
    key: t.key,
    name: t.name,
    aliases: t.aliases,
    type: t.type,
    nameContext: 'VEHICLE_PLATE_ALLOCATION',
    source: source(t.referenceId),
  };
};
// Test-only projection of reviewed facts. These clocks are fixture clocks, not a real import.
const rows = dataset.allocations.map((r) => ({
  key: r.key,
  numericPrefix: r.numericPrefix,
  seriesPrefix: r.seriesPrefix,
  status: r.status,
  target: target(r.targetKey),
  effectiveFrom: r.effectiveFrom,
  effectiveTo: r.effectiveTo,
  previousTargets: dataset.history
    .filter((h) => h.allocationKey === r.key)
    .map((h) => ({
      previousTarget: target(h.previousTargetKey),
      effectiveFrom: h.effectiveFrom,
      effectiveTo: h.effectiveTo,
      source: source(h.sourceReferenceId),
      transitionSource: source(h.transitionReferenceId),
    })),
  source: source(r.referenceId),
  importedAt: '2026-09-15T02:21:09Z',
  updatedAt: '2026-09-15T02:21:09Z',
}));
let mode = 'healthy',
  requests = 0;
const fold = (v) => v.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase();
const fixture = createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (mode === 'unavailable') {
    res.writeHead(503).end('{}');
    return;
  }
  if (mode === 'malformed') {
    res.end('{}');
    return;
  }
  const u = new URL(req.url, 'http://fixture.test');
  if (!u.pathname.startsWith('/api/v1/vehicle-plates')) {
    res.writeHead(404).end('{}');
    return;
  }
  requests++;
  const path = u.pathname.slice('/api/v1/vehicle-plates'.length);
  if (path === '' || path === '/search') {
    const q = fold(u.searchParams.get('q') ?? '');
    const found =
      mode === 'empty'
        ? []
        : rows.filter((r) => fold([r.numericPrefix, r.target.name, ...r.target.aliases].join(' ')).includes(q));
    const page = Number(u.searchParams.get('page') ?? 1),
      size = Number(u.searchParams.get('pageSize') ?? 20);
    res.end(
      JSON.stringify({ items: found.slice((page - 1) * size, page * size), total: found.length, page, pageSize: size }),
    );
    return;
  }
  let parsed;
  try {
    parsed = parseVehiclePlate(path === '/lookup' ? (u.searchParams.get('value') ?? '') : path.split('/')[1]);
  } catch {
    res.writeHead(400).end('{}');
    return;
  }
  const allocations = rows.filter((r) => r.numericPrefix === parsed.numericPrefix);
  if (!allocations.length) {
    res.writeHead(404).end('{}');
    return;
  }
  if (path.endsWith('/related')) {
    res.end(
      JSON.stringify(
        rows.filter((r) => r.target.key === allocations[0].target.key && r.numericPrefix !== parsed.numericPrefix),
      ),
    );
    return;
  }
  res.end(
    JSON.stringify({
      parsed: { numericPrefix: parsed.numericPrefix, series: parsed.series, seriesAllocationVerified: false },
      resolution: 'NUMERIC_PREFIX_ALLOCATION',
      allocations,
      ambiguous: allocations.length > 1,
      vehicleOrOwnerVerified: false,
    }),
  );
});
fixture.listen(0, '127.0.0.1');
await once(fixture, 'listening');
const apiOrigin = `http://127.0.0.1:${fixture.address().port}`;
const origin = 'http://127.0.0.1:4178';
const canonicalOrigin = 'https://vehicle.example.test';
const server = spawn(process.execPath, ['dist/web/server/server.mjs'], {
  cwd: new URL('../', import.meta.url),
  env: {
    ...process.env,
    PORT: '4178',
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
  for (const [path, answer] of [
    ['/vi/tra-cuu/bien-so/51', 'Mã biển số 51 được phân bổ cho TP. Hồ Chí Minh.'],
    ['/en/lookup/vehicle-plate/43', 'Plate prefix 43 is allocated to Đà Nẵng.'],
    ['/vi/tra-cuu/bien-so/51K', 'Mã biển số 51 được phân bổ cho TP. Hồ Chí Minh.'],
    ['/vi/tra-cuu/bien-so/61', 'Bình Dương'],
  ]) {
    const res = await fetch(origin + path);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes(answer));
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    if (!path.endsWith('51K')) {
      assert.ok(html.includes('hreflang="vi"'));
      assert.ok(html.includes('hreflang="en"'));
    }
    const canonicalPath = path.endsWith('51K') ? path.slice(0, -1) : path;
    assert.ok(html.includes(`rel="canonical" href="${canonicalOrigin + canonicalPath}"`));
    if (path.endsWith('51K')) assert.ok(html.includes('noindex, follow'));
    const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) =>
      JSON.parse(m[1]),
    );
    assert.ok(schemas.some((x) => x['@type'] === 'WebPage'));
    assert.ok(schemas.some((x) => x['@type'] === 'BreadcrumbList'));
  }
  for (const base of ['/vi/tra-cuu/bien-so', '/en/lookup/vehicle-plate']) {
    const res = await fetch(origin + base);
    assert.equal(res.status, 200);
    const html = await res.text();
    for (const r of rows) assert.ok(html.includes(base + '/' + r.numericPrefix));
  }
  for (const prefix of ['42', 'abc', '51K-123.45']) {
    const res = await fetch(origin + '/vi/tra-cuu/bien-so/' + prefix);
    assert.equal(res.status, 404);
    const html = await res.text();
    assert.ok(html.includes('noindex'));
    assert.ok(!html.includes('rel="canonical"'));
    assert.ok(!html.includes('51K-123.45'));
  }
  const sitemap = await (await fetch(origin + '/sitemap-vehicle-plate.xml')).text();
  assert.equal((sitemap.match(/<loc>/g) ?? []).length, 164);
  assert.ok(!sitemap.includes('51K'));
  assert.ok((await (await fetch(origin + '/sitemap.xml')).text()).includes('sitemap-vehicle-plate.xml'));
  for (const state of ['unavailable', 'malformed', 'empty']) {
    mode = state;
    const res = await fetch(origin + '/vi/tra-cuu/bien-so');
    assert.equal(res.status, 503);
    assert.ok((await res.text()).includes('noindex'));
    assert.equal((await fetch(origin + '/sitemap-vehicle-plate.xml')).status, 503);
  }
  mode = 'healthy';
  console.log('Vehicle SSR, metadata, history, series canonical, privacy, 404/503, 164 sitemap URLs passed.');
  if (process.env.PLAYWRIGHT_MODULE) {
    const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const before = requests;
    await page.goto(origin + '/vi/tra-cuu/bien-so/51');
    await page.waitForLoadState('networkidle');
    assert.equal(requests - before, 2, 'transfer state should avoid duplicate detail/related requests');
    for (const path of [
      '/vi/tra-cuu/bien-so/51',
      '/en/lookup/vehicle-plate/43',
      '/vi/tra-cuu/bien-so/61',
      '/vi/tra-cuu/bien-so',
      '/en/lookup/vehicle-plate',
      '/vi/tra-cuu/bien-so/42',
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
    if (process.env.VEHICLE_SCREENSHOTS) await mkdir(process.env.VEHICLE_SCREENSHOTS, { recursive: true });
    for (const theme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: theme });
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(origin + '/vi/tra-cuu/bien-so/51');
        await page.waitForLoadState('networkidle');
        const answer = await page.locator('.answer').boundingBox();
        assert.ok(answer.y + answer.height < 900);
        if (process.env.VEHICLE_SCREENSHOTS)
          await page.screenshot({ path: `${process.env.VEHICLE_SCREENSHOTS}/${theme}-${width}.png`, fullPage: true });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + '/vi/tra-cuu/bien-so');
    await page.waitForLoadState('networkidle');
    await page.locator('#vehicle-search').fill('Da Nang');
    await page.locator('.search-panel button').click();
    await page.waitForFunction(() => document.querySelector('.search-results'));
    assert.ok((await page.locator('.search-results').textContent()).includes('Đà Nẵng'));
    const number = '51K-' + '123.45';
    await page.locator('#vehicle-search').fill(number);
    await page.locator('.search-panel button').click();
    await page.waitForURL('**/51K');
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
