import { readAreaCatalogue } from './app/area-codes/area-data';
import { readCatalogue } from './app/phone-prefixes/phone-data';
import { areaPath, phonePath, supportedLocales } from './app/i18n/routes';
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
)
  throw new Error('API_ORIGIN must be an HTTP(S) origin without credentials, path or query');
const apiOrigin = apiUrl.origin;
function apiGateway(pattern: RegExp) {
  return async (req: express.Request, res: express.Response) => {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' });
    if (!pattern.test(req.path)) {
      res.status(404).json({ statusCode: 404 });
      return;
    }
    try {
      const response = await fetch(apiOrigin + req.originalUrl, {
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      });
      res
        .status(response.status)
        .type('application/json')
        .send(await response.text());
    } catch {
      res.status(503).json({ statusCode: 503 });
    }
  };
}
app.get(
  ['/api/v1/phone-prefixes', '/api/v1/phone-prefixes/{*path}'],
  apiGateway(/^\/api\/v1\/phone-prefixes(?:\/(?:lookup|search|\d{3,4}(?:\/related)?))?$/),
);
app.get(
  ['/api/v1/area-codes', '/api/v1/area-codes/{*path}'],
  apiGateway(/^\/api\/v1\/area-codes(?:\/(?:lookup|search|0[1-9]\d{0,2}(?:\/related)?))?$/),
);
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const queryStart = req.originalUrl.indexOf('?');
  const pathname = queryStart < 0 ? req.originalUrl : req.originalUrl.slice(0, queryStart);
  const target = redirectPath(pathname);
  if (target) {
    res.redirect(308, target + (queryStart < 0 ? '' : req.originalUrl.slice(queryStart)));
    return;
  }
  next();
});
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(robotsTxt(siteConfig));
});
app.get(
  ['/sitemap.xml', '/sitemap-static.xml', '/sitemap-phone-prefix.xml', '/sitemap-area-code.xml'],
  async (req, res) => {
    if (!siteConfig.origin || !siteConfig.allowIndexing) {
      res
        .status(503)
        .set('X-Robots-Tag', 'noindex')
        .type('text/plain')
        .send('Sitemap unavailable: indexing is disabled.');
      return;
    }
    let phoneRows: Awaited<ReturnType<typeof readCatalogue>> = [];
    let areaRows: Awaited<ReturnType<typeof readAreaCatalogue>> = [];
    if (req.path === '/sitemap.xml' || req.path === '/sitemap-phone-prefix.xml') {
      try {
        phoneRows = await readCatalogue(apiOrigin);
      } catch {
        if (req.path === '/sitemap-phone-prefix.xml') {
          res.status(503).set('X-Robots-Tag', 'noindex').send('Prefix sitemap temporarily unavailable.');
          return;
        }
      }
    }
    if (req.path === '/sitemap.xml' || req.path === '/sitemap-area-code.xml') {
      try {
        areaRows = await readAreaCatalogue(apiOrigin);
      } catch {
        if (req.path === '/sitemap-area-code.xml') {
          res.status(503).set('X-Robots-Tag', 'noindex').send('Area code sitemap temporarily unavailable.');
          return;
        }
      }
    }
    const segments = [
      '/sitemap-static.xml',
      ...(phoneRows.length ? ['/sitemap-phone-prefix.xml'] : []),
      ...(areaRows.length ? ['/sitemap-area-code.xml'] : []),
    ];
    const phoneUrls = supportedLocales.flatMap((locale) => [
      phonePath(locale),
      ...phoneRows.map((row) => phonePath(locale, row.prefix)),
    ]);
    const areaUrls = supportedLocales.flatMap((locale) => [
      areaPath(locale),
      ...areaRows.map((row) => areaPath(locale, row.code)),
    ]);
    const urls = (req.path === '/sitemap-phone-prefix.xml' ? phoneUrls : areaUrls).map(
      (path) => siteConfig.origin + path,
    );
    const xml =
      req.path === '/sitemap.xml'
        ? sitemapIndexXml(siteConfig.origin, segments)
        : sitemapXml(req.path === '/sitemap-static.xml' ? sitemapUrls(siteConfig) : urls);
    res.type('application/xml').send(xml);
  },
);
app.use(express.static(browserDistFolder, { maxAge: '1y', index: false, redirect: false }));
app.use((req, res, next) => {
  angularApp
    .handle(req, { siteConfig, apiOrigin })
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) throw error;
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}
export const reqHandler = createNodeRequestHandler(app);
