# Data sources

Through Phase 5 no factual dataset was integrated. Phase 6 adds a reviewed phone-prefix snapshot and a manual
transactional importer; live PostgreSQL import remains pending. No financial, weather, administrative or tariff data
has been integrated.

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

SyncRun provides durable typed audits with safe bounded errors and measured counts. No successful synchronization
timestamp is seeded; the Phase 6 importer records actual attempts only when run. SourceReference stores actual retrieved
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

## Phone-prefix dataset — Phase 6

Reviewed on 2026-09-11. The versioned factual snapshot is `apps/api/data/phone-prefixes.json`: 7 operators,
36 current prefix families and 21 historical conversions. It is a reviewed subset, not a complete national allocation
register or subscriber database. More recent/shared MVNO suballocations are not inferred from parent prefixes.
`ACTIVE` describes the reviewed prefix allocation, not whether a particular number is assigned, dialable or in service.

### Source registry

All eight sources below were read through their publicly accessible web pages on 2026-09-11. The dataset records
individual reference UUIDs, exact retrieval instants, document titles and URLs. Publication instants remain null when
only a date/no time is available. No login, CAPTCHA bypass, aggressive crawler or provider API is used.

| Publisher / official status                       | Document                                                                                                                                                           | Data used                                       | Notes                                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Viettel — official                                | [Viettel prefix list](https://098.viettel.vn/tin-tuc/chi-tiet/nhung-dieu-can-luu-y-khi-mua-sim-so-dep-viettel/12591760)                                            | 032 033 034 035 036 037 038 039 086 096 097 098 | Operator source; only the allocation list is retained.                                                                |
| VinaPhone — official                              | [VNPT SIM guide](https://digishop.vnpt.vn/tin-tuc-km/tu-van/sim-vinaphone-so-dep-gia-re)                                                                           | 081 082 083 084 085 088 091 094                 | Uses the eight-prefix Digishop list. The broader VNPT FAQ contains conflicting 086/087/089 claims and was not used.   |
| MobiFone — official                               | [MobiFone prefix/conversion table](https://giaiphap.mobifone.vn/danh-sach-dau-so-tong-dai-di-dong-mobifone/)                                                       | 070 076 077 078 079 089 090 093                 | Operator-owned service site; factual allocations only, not editorial material or listed subscriber numbers.           |
| Vietnamobile — official                           | [Vietnamobile public form prefix hint](https://www.vietnamobile.com.vn/tracuutttb)                                                                                 | 052 056 058 092                                 | Only the visible 092/058/056/052 placeholder was read; no number submitted, subscriber queried or OTP requested.      |
| Gmobile — official                                | [Gmobile tariff applicability](https://gmobile.vn/goi-cuoc)                                                                                                        | 059 099                                         | Official 059x/099x subranges support the parent-prefix association; not proof that all subranges are in use.          |
| iTel — official                                   | [iTel SIM replacement notice](https://itel.vn/tin-tuc/tin-tuc-itel/the-gioi-di-dong-tich-hop-tinh-nang-doi-sim-cho-thue-bao-itel.html)                             | 087                                             | Official notice identifies 087; brand kept canonical, not translated.                                                 |
| Wintel — official                                 | [Wintel offer identifying 055](https://wintel.vn/tin-tuc/don-tai-loc-hanh-thong-san-so-dep-0d-voi-goi-cuoc-data-uu-dai-chi-tu-3-000d-ngay-cua-mang-di-dong-wintel) | 055                                             | Official article identifies 055; no marketing claims, prices or images imported.                                      |
| Cổng thông tin Bộ TT&TT (nay Bộ KH&CN) — official | [Ministry-hosted conversion schedule](https://spdv.mic.gov.vn/chi-tiet-moc-thoi-gian-chuyen-doi-thue-bao-tu-11-so-xuong-10-so-197118208.htm)                       | 21 old → new conversions                        | Official ministry host republishes a Vietnam+ report; not the original allocation decision. Historical mappings only. |

The ministry page requests attribution to https://mst.gov.vn, retained as publisherUrl in API evidence. Its displayed
publication time is stored separately from retrieval. Other pages retain copyright notices; no general open-content
license was identified. Only independently reviewable numeric mappings, brand identities, source URLs and short source
metadata are retained. No editorial articles, SIM listings, images, subscriber records or full raw pages are copied.
This does not claim a blanket reuse license; recheck terms before changing retrieval or republishing richer content.

### Coverage and historical semantics

- Viettel (12): 032, 033, 034, 035, 036, 037, 038, 039, 086, 096, 097, 098.
- VinaPhone (8): 081, 082, 083, 084, 085, 088, 091, 094.
- MobiFone (8): 070, 076, 077, 078, 079, 089, 090, 093.
- Vietnamobile (4): 052, 056, 058, 092.
- Gmobile (2): 059, 099.
- iTel (1): 087.
- Wintel (1): 055.

Verified conversions (all have explicit old/new relations and ministry evidence):

- Viettel: 0162 → 032, 0163 → 033, 0164 → 034, 0165 → 035, 0166 → 036, 0167 → 037, 0168 → 038, 0169 → 039.
- VinaPhone: 0123 → 083, 0124 → 084, 0125 → 085, 0127 → 081, 0129 → 082.
- MobiFone: 0120 → 070, 0121 → 079, 0122 → 077, 0126 → 076, 0128 → 078.
- Vietnamobile: 0186 → 056, 0188 → 058.
- Gmobile: 0199 → 059.

The 2018 report describes staggered scheduled migrations, including a special 0169 subrange, and a period of parallel
dialing. A single exact legal/service cutover instant for each whole prefix is not established by that evidence, so
migration effectiveAt and allocation effective intervals remain null. Null is unknown, not the import date. A later
review can add a confirmed instant with new evidence; never assign 15 September universally or fabricate precision.

Allocation is distinct from the current serving network because of number portability. The API explicitly returns
operatorResolution=PREFIX_ALLOCATION and currentSubscriberNetworkVerified=false. It performs no portability query.
See the ministry's [number-portability notice](https://cspl.mic.gov.vn/Pages/TinTuc/tinchitiet.aspx?tintucid=139112)
for context; this is not a subscriber lookup or an implementation of porting rules.

### Maintenance and import

Research an official change → update structured JSON and new evidence UUIDs → validate → migrate if needed → import/upsert
→ run tests → commit reviewed source changes. Normal dataset maintenance never requires changing query-service code.
The snapshot is reviewed manually on official change announcements and before a deployment needing fresh allocations;
there is no scheduled scraping or claim of continuous freshness.

Use `pnpm --filter @tranhanh/api phone-prefixes:validate`; it builds the API and validates the complete file without a DB.
`pnpm --filter @tranhanh/api phone-prefixes:import` requires explicit DATABASE_URL and already-applied migrations.
The importer uses a non-official TraNhanh maintainer source/provider for audit identity; factual attribution always
points to the individual official publication, never to that maintainer source.

Validation rejects duplicate keys/prefixes, missing publishers/evidence/operators, invalid URLs/dates, incompatible
status/length, incomplete legacy mappings and cross-operator conversions. It validates before any write. Upserts run
in one domain transaction under an advisory lock. Re-importing unchanged data preserves prefix timestamps; changed
records get their actual import time. Evidence UUIDs are immutable snapshots; a changed publication/retrieval needs a
new UUID. Publisher/adapter bootstrap and RUNNING audit precede the domain transaction; failures record a safe error.

No rows are automatically deleted when omitted from a later file. Retire a current prefix explicitly as INACTIVE and
review its historical relations first. Operator reassignments and changed old→new targets are refused and need a reviewed
history/correction migration; a new JSON row must not erase prior attribution. Test fixtures are isolated under test/
and never read by the production CLI. Live migration/import and constraint tests remain pending while Docker is unavailable.
