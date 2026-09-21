import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const publicOrigin = 'https://seo.example.test'; // Test fixture only, never a deployment default.
const origin = 'http://127.0.0.1:4174';
function elements(html, tag) {
  return [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))].map((match) =>
    Object.fromEntries([...match[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map((attribute) => attribute.slice(1))),
  );
}
function meta(html, key) {
  return elements(html, 'meta')
    .filter((tag) => tag.name === key || tag.property === key)
    .map((tag) => tag.content);
}
function links(html, rel) {
  return elements(html, 'link').filter((tag) => tag.rel === rel);
}
function schemas(html) {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((match) =>
    JSON.parse(match[1]),
  );
}

for (const allowIndexing of [true, false]) {
  const api = createServer((_req, res) => {
    res.statusCode = 404;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ statusCode: 404 }));
  });
  await new Promise((resolve, reject) => api.listen(0, '127.0.0.1', resolve).once('error', reject));
  const address = api.address();
  assert.ok(address && typeof address !== 'string');
  const apiOrigin = `http://127.0.0.1:${address.port}`;
  const server = spawn(process.execPath, ['dist/web/server/server.mjs'], {
    cwd: new URL('../', import.meta.url),
    env: {
      ...process.env,
      PORT: '4174',
      API_ORIGIN: apiOrigin,
      PUBLIC_SITE_URL: allowIndexing ? publicOrigin : '',
      PUBLIC_ALLOW_INDEXING: String(allowIndexing),
    },
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
  try {
    for (let attempt = 0; attempt < 100 && !logs.includes('listening on'); attempt++) {
      if (server.exitCode !== null) throw new Error(logs);
      await delay(100);
    }
    assert.match(logs, /listening on/);
    for (const [path, target] of [
      ['/', '/vi'],
      ['/design-system/', '/vi/design-system'],
      ['/EN//design-system/?demo=1', '/en/design-system?demo=1'],
      ['/VI/', '/vi'],
    ]) {
      const response = await fetch(origin + path, { redirect: 'manual' });
      assert.equal(response.status, 308, path);
      assert.equal(response.headers.get('location'), target);
      assert.equal((await fetch(origin + target, { redirect: 'manual' })).status, 200);
    }
    const titles = [];
    const descriptions = [];
    for (const locale of ['vi', 'en']) {
      for (const suffix of ['', '/design-system']) {
        const response = await fetch(`${origin}/${locale}${suffix}?utm_source=test`);
        assert.equal(response.status, 200);
        const html = await response.text();
        assert.match(html, new RegExp(`<html[^>]*lang="${locale}"`));
        const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
        assert.ok(title?.includes('TraNhanh'));
        const description = meta(html, 'description');
        assert.equal(description.length, 1);
        assert.ok(description[0].length > 30);
        if (!suffix) {
          titles.push(title);
          descriptions.push(description[0]);
        }
        const policy = suffix ? 'noindex, nofollow' : `${allowIndexing ? 'index' : 'noindex'}, follow`;
        assert.deepEqual(meta(html, 'robots'), [policy]);
        assert.equal(response.headers.get('x-robots-tag'), policy);
        assert.deepEqual(meta(html, 'og:locale'), [locale === 'vi' ? 'vi_VN' : 'en_US']);
        assert.equal(meta(html, 'og:title').length, 1);
        assert.equal(meta(html, 'og:description').length, 1);
        assert.deepEqual(meta(html, 'og:type'), ['website']);
        assert.equal(meta(html, 'og:image').length, 0);
        assert.deepEqual(meta(html, 'twitter:card'), ['summary']);
        assert.equal(links(html, 'canonical').length, allowIndexing ? 1 : 0);
        if (allowIndexing) {
          assert.equal(links(html, 'canonical')[0].href, `${publicOrigin}/${locale}${suffix}`);
          assert.deepEqual(meta(html, 'og:url'), [`${publicOrigin}/${locale}${suffix}`]);
          const alternates = links(html, 'alternate');
          assert.equal(alternates.length, suffix ? 0 : 2);
          if (!suffix)
            for (const language of ['vi', 'en']) {
              assert.ok(
                alternates.some((tag) => tag.hreflang === language && tag.href === `${publicOrigin}/${language}`),
              );
            }
          const data = schemas(html);
          assert.equal(data.length, 1);
          assert.equal(data[0]['@type'], suffix ? 'BreadcrumbList' : 'WebSite');
          assert.doesNotMatch(JSON.stringify(data), /SearchAction|AggregateRating|Review|undefined|sameAs/);
        } else {
          assert.equal(links(html, 'alternate').length, 0);
          assert.equal(schemas(html).length, 0);
        }
        assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
      }
    }
    assert.notEqual(titles[0], titles[1]);
    assert.notEqual(descriptions[0], descriptions[1]);
    for (const path of ['/a-page-that-does-not-exist', '/vi/not-a-real-page', '/en/not-a-real-page', '/fr', '/abc']) {
      const response = await fetch(origin + path, { redirect: 'manual' });
      assert.equal(response.status, 404, path);
      const html = await response.text();
      const english = path.startsWith('/en/');
      assert.ok(html.includes(english ? 'Page not found' : 'Không tìm thấy trang'));
      assert.match(html, new RegExp(`<html[^>]*lang="${english ? 'en' : 'vi'}"`));
      assert.deepEqual(meta(html, 'robots'), ['noindex, follow']);
      assert.equal(links(html, 'canonical').length, 0);
      assert.equal(links(html, 'alternate').length, 0);
      assert.equal(schemas(html).length, 0);
    }
    const robots = await fetch(origin + '/robots.txt');
    assert.equal(robots.status, 200);
    assert.match(robots.headers.get('content-type'), /text\/plain/);
    const text = await robots.text();
    assert.ok(text.includes(allowIndexing ? `Sitemap: ${publicOrigin}/sitemap.xml` : 'Disallow: /'));
    for (const path of ['/sitemap.xml', '/sitemap-static.xml']) {
      const response = await fetch(origin + path);
      assert.equal(response.status, allowIndexing ? 200 : 503);
      const xml = await response.text();
      if (allowIndexing) {
        assert.match(response.headers.get('content-type'), /application\/xml/);
        assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
        assert.doesNotMatch(xml, /design-system|not-a-real|localhost|undefined/);
        const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
        assert.deepEqual(
          locs,
          path === '/sitemap.xml'
            ? [publicOrigin + '/sitemap-static.xml']
            : [
                publicOrigin + '/en',
                publicOrigin + '/en/fuel-prices',
                publicOrigin + '/en/lookup/traffic-fines',
                publicOrigin + '/vi',
                publicOrigin + '/vi/gia-xang',
                publicOrigin + '/vi/tra-cuu/phat-nguoi',
              ],
        );
      }
    }
    if (allowIndexing && process.env['PLAYWRIGHT_MODULE']) {
      const { chromium } = await import(process.env['PLAYWRIGHT_MODULE']);
      browser = await chromium.launch({ headless: true, executablePath: process.env['CHROME_EXECUTABLE'] });
      context = await browser.newContext();
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error' && !message.text().includes('404')) {
          errors.push(message.text());
        }
      });
      for (const locale of ['vi', 'en']) {
        const response = await page.goto(`${origin}/${locale}/not-a-real-page`, { waitUntil: 'networkidle' });
        assert.equal(response.status(), 404);
        for (const width of [390, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        }
        await page.locator('main a').focus();
        await page.locator('main a').press('Enter');
        await page.waitForURL(`${origin}/${locale}`);
        await page.waitForFunction(() => document.querySelector('link[rel="canonical"]'));
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `${publicOrigin}/${locale}`);
        await page.goto(`${origin}/${locale}/design-system`, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => document.querySelector('meta[name="robots"]').content === 'noindex, nofollow');
        await page.locator('a.brand').click();
        await page.waitForURL(`${origin}/${locale}`);
        await page.waitForFunction(() => document.querySelector('meta[name="robots"]').content === 'index, follow');
        assert.equal(await page.locator('link[rel="canonical"]').count(), 1);
        assert.equal(await page.locator('script[type="application/ld+json"]').count(), 1);
      }
      if (process.env['SEO_SCREENSHOTS']) {
        const directory = await mkdtemp(join(tmpdir(), 'tranhanh-seo-'));
        for (const [locale, width] of [
          ['vi', 390],
          ['en', 1440],
        ]) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(`${origin}/${locale}/not-a-real-page`, { waitUntil: 'networkidle' });
          await page.screenshot({ path: join(directory, `${locale}-${width}.png`) });
        }
        console.log(`Review and remove temporary screenshots: ${directory}`);
      }
      assert.deepEqual(errors, []);
      console.log('Headless: localized 404 layouts, keyboard return-home, metadata cleanup and hydration passed.');
    }
    assert.doesNotMatch(logs, /ERROR|uncaughtException/);
    console.log(`SSR SEO passed: ${allowIndexing ? 'configured/indexable' : 'unconfigured/safe'} environment.`);
  } finally {
    await context?.close();
    await browser?.close();
    if (server.exitCode === null) {
      server.kill('SIGTERM');
      await once(server, 'exit');
    }
    await new Promise((resolve) => api.close(resolve));
  }
}
