# Data sources

No data providers are integrated or approved through Phase 5. No factual lookup dataset or
financial, weather, administrative, or tariff data has been imported.

Before integrating each provider, record:

- Name and official URL/domain.
- Data type and retrieval method.
- Update cadence.
- Terms/licensing notes and any required credentials or acceptance.
- Failure fallback and stale-data behavior.
- Actual last-reviewed date.

Prefer official APIs, official structured publications, licensed APIs, or legal public datasets.
Do not bypass authentication, CAPTCHA, rate limits, or robots restrictions. Do not copy editorial
content or protected graphics. Never fabricate values, citations, or update timestamps.

## Persistence architecture

External publisher → DataSource → Provider adapter → validation → normalization → domain table → source attribution.

DataSource stores the publisher's stable key, official name, public URLs, and active/official flags. Localized descriptions
and licensing notes belong to DataSourceTranslation (one vi/en row per source). DataProvider stores adapter identity,
source FK, type, disabled/active/degraded status, and optional genuine last success/failure instants. Credentials are
external secrets, never provider metadata. Both publisher and adapter identity are retained when disabled.

SyncRun provides durable typed audits with safe bounded errors and measured counts. No adapter is integrated or approved,
no factual values imported, and no successful synchronization timestamp seeded. SourceReference stores actual retrieved
publication evidence. Later domain tables link to evidence using explicit foreign keys instead of polymorphic entity IDs.
The same source URL may be retrieved repeatedly with new content; URLs are not globally unique evidence identities.

Future writes must use the URL-boundary helper and explicit DTO validation. Current metadata URLs accept HTTP(S) without
credentials, query strings, or fragments; query-based sources need a reviewed adapter policy. Fetching additionally needs
host/redirect checks. Never store secret tokens, raw exception messages, or full provider responses in audit notes.

Imports validate and normalize before transactional upserts. Scope external IDs/natural keys to the relevant provider;
only introduce versioned normalized fingerprints where stable IDs are absent. Store raw payloads only after defining
retention, size limits, access control, and secret/PII filtering. The default is no raw-payload persistence.
Source/provider deletion is restricted where historical rows depend on it. Preserve evidence and disable obsolete adapters.
See [Database core architecture](architecture.md#database-core-phase-5) for timestamp, idempotency, and indexing conventions.
