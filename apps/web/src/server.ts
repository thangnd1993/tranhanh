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
app.get(['/sitemap.xml', '/sitemap-static.xml'], (req, res) => {
  if (!siteConfig.origin || !siteConfig.allowIndexing) {
    res
      .status(503)
      .set('X-Robots-Tag', 'noindex')
      .type('text/plain')
      .send('Sitemap unavailable: indexing is disabled.');
    return;
  }
  const xml = req.path === '/sitemap.xml' ? sitemapIndexXml(siteConfig.origin) : sitemapXml(sitemapUrls(siteConfig));
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
    .handle(req, { siteConfig })
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
