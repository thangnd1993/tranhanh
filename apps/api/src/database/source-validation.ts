/** Metadata only; validating a URL does not authorize fetching it (future adapters need host allowlists). */
export function normalizeSourceUrl(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || value.length > 2048) {
    throw new Error('Source URL must be HTTP(S), at most 2048 characters, and contain no credentials.');
  }
  // Query strings can contain signed tokens; source attribution stores public, stable URLs only.
  if (url.search || url.hash) {
    throw new Error('Source URL must not contain query parameters or a fragment.');
  }
  const normalized = url.toString();
  if (normalized.length > 2048) {
    throw new Error('Source URL exceeds the storage limit.');
  }
  return normalized;
}
