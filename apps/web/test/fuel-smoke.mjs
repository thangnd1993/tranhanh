import assert from 'node:assert/strict';
const origin = process.env.FUEL_SMOKE_ORIGIN || 'http://127.0.0.1:4201';
for (const [path, h1, price, unit] of [
  ['/vi/gia-xang', 'Giá xăng hôm nay', '25.139', 'đồng/lít'],
  ['/en/fuel-prices', 'Fuel Prices in Vietnam', '25,139', 'VND/liter'],
]) {
  const response = await fetch(origin + path);
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const expected of [
    h1,
    price,
    unit,
    'Bộ Công Thương',
    '7458/BCT-TTTN',
    'canonical',
    'hreflang',
    'BreadcrumbList',
    'index, follow',
  ])
    assert.ok(html.includes(expected), `${path} missing ${expected}`);
}
const sitemap = await (await fetch(origin + '/sitemap-static.xml')).text();
for (const path of ['/vi/gia-xang', '/en/fuel-prices']) assert.equal(sitemap.split(path).length - 1, 1);
console.log('Fuel Price raw SSR, exact values, source, metadata and two sitemap URLs passed.');
