const raw = process.env['DATABASE_URL'];
if (!raw || process.env['NODE_ENV'] !== 'test') {
  throw new Error('Runtime integration tests require NODE_ENV=test and an explicit local test database.');
}
const url = new URL(raw);
if (
  url.protocol !== 'postgresql:' ||
  !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
  url.pathname !== '/tranhanh_test' ||
  (url.searchParams.get('schema') ?? 'public') !== 'public'
) {
  throw new Error('Runtime integration tests only allow local tranhanh_test with the public schema.');
}
