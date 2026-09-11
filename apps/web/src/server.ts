import { readCatalogue } from './app/phone-prefixes/phone-data';
import { phonePath, supportedLocales } from './app/i18n/routes';
import { readSiteConfig, redirectPath } from './app/seo/site-config';
import { robotsTxt, sitemapIndexXml, sitemapUrls, sitemapXml } from './app/seo/sitemap';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();
const siteConfig = readSiteConfig(process.env);
const apiUrl = new URL(process.env['API_ORIGIN'] || 'http://127.0.0.1:3000');
if (
  !['http:', 'https:'].includes(apiUrl.protocol) ||
  apiUrl.username ||
  apiUrl.password ||
  apiUrl.pathname !== '/' ||
  apiUrl.search ||
  apiUrl.hash
) {
  throw new Error('API_ORIGIN must be an HTTP(S) origin without credentials, path or query');
}
const apiOrigin = apiUrl.origin;
// A narrowly scoped same-origin browser gateway. Never log lookup query strings or cache numbers.
app.get(['/api/v1/phone-prefixes', '/api/v1/phone-prefixes/{*path}'], async (req, res) => {
  res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' });
  if (!/^\/api\/v1\/phone-prefixes(?:\/(?:lookup|search|\d{3,4}(?:\/related)?))?$/.test(req.path)) {
    res.status(404).json({ statusCode: 404 });
    return;
  }
  try {
    const response = await fetch(apiOrigin + req.originalUrl, { signal: AbortSignal.timeout(5000), redirect: 'error' });
    res
      .status(response.status)
      .type('application/json')
      .send(await response.text());
  } catch {
    res.status(503).json({ statusCode: 503 });
  }
});

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const queryStart = req.originalUrl.indexOf('?');
  const pathname = queryStart < 0 ? req.originalUrl : req.originalUrl.slice(0, queryStart);
  const target = redirectPath(pathname);
  if (target) {
    const query = queryStart < 0 ? '' : req.originalUrl.slice(queryStart);
    res.redirect(308, target + query);
    return;
  }
  next();
});
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(robotsTxt(siteConfig));
});
app.get(['/sitemap.xml', '/sitemap-static.xml', '/sitemap-phone-prefix.xml'], async (req, res) => {
  if (!siteConfig.origin || !siteConfig.allowIndexing) {
    res
      .status(503)
      .set('X-Robots-Tag', 'noindex')
      .type('text/plain')
      .send('Sitemap unavailable: indexing is disabled.');
    return;
  }
  let rows: Awaited<ReturnType<typeof readCatalogue>> = [];
  if (req.path !== '/sitemap-static.xml') {
    try {
      rows = await readCatalogue(apiOrigin);
    } catch {
      if (req.path === '/sitemap-phone-prefix.xml') {
        res.status(503).set('X-Robots-Tag', 'noindex').send('Prefix sitemap temporarily unavailable.');
        return;
      }
    }
  }
  if (req.path === '/sitemap-phone-prefix.xml' && rows.length === 0) {
    res.status(503).set('X-Robots-Tag', 'noindex').send('Prefix sitemap temporarily unavailable.');
    return;
  }
  const segments = ['/sitemap-static.xml', ...(rows.length ? ['/sitemap-phone-prefix.xml'] : [])];
  const urls = supportedLocales
    .flatMap((locale) => [phonePath(locale), ...rows.map((row) => phonePath(locale, row.prefix))])
    .map((path) => siteConfig.origin + path);
  const xml =
    req.path === '/sitemap.xml'
      ? sitemapIndexXml(siteConfig.origin, segments)
      : sitemapXml(req.path === '/sitemap-static.xml' ? sitemapUrls(siteConfig) : urls);
  res.type('application/xml').send(xml);
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req, { siteConfig, apiOrigin })
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
