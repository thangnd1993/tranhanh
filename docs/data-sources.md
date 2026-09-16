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

## Fixed-line area-code dataset — Phase 8

Reviewed on 2026-09-11; implementation completed on 2026-09-14. File: `apps/api/data/area-codes.json`.
Only factual assignments, names, dates and evidence metadata are retained; no article bodies, images, subscriber
records or downloaded source documents are bundled. Each code and migration has a SourceReference UUID.

### Primary current-assignment source

- Publisher: Bộ Khoa học và Công nghệ — Cục Viễn thông (official ministry/regulator).
- Title: Thông cáo báo chí về việc thực hiện quy hoạch mã vùng điện thoại cố định mặt đất kể từ 01/7/2025.
- [Ministry publication](https://mst.gov.vn/thong-cao-bao-chi-ve-viec-thuc-hien-quy-hoach-ma-vung-dien-thoai-co-dinh-mat-dat-ke-tu-01-7-2025-197250704101929995.htm).
- [Attached 2784/BKHCN-CVT document](https://mic.mediacdn.vn/639352410187198464/2025/7/4/qd-2784-17515990510092008338259.pdf).
- Published: 2025-07-04 10:19 Vietnam time; instructions apply from 2025-07-01.
- Retrieval: public HTML tables read manually; the attached PDF text/annex cross-checked. Reviewed 2026-09-11.
- Extracted: 63 operating codes, 63 source-era service-area names, and their 34 telecom groupings.
  The 23 merged groups temporarily retain multiple codes. Proposed future consolidation is deliberately excluded.
- Reuse: ministry footer requests attribution to mst.gov.vn. No open-content license or unrestricted reuse permission
  is inferred; only factual data and attribution are retained.

### Historical conversion source

- Publisher: VNPT Hà Nội, official operator website; the page credits Xã hội thông tin.
- Title: Danh sách mã vùng điện thoại cố định sau chuyển đổi.
- [Operator publication and conversion tables](https://vinaphonehanoi.vnpt.vn/tin-tuc-chi-tiet/danh-sach-ma-vung-dien-thoai-co-dinh-sau-chuyen-doi-22).
- Published: 2018-11-02, day precision. SourceReference.publishedAt is null because no publication instant is given;
  the known publication day is recorded in reference notes. Retrieved/reviewed 2026-09-11.
- Extracted: 59 historical old/new code pairs, starting in three phases: 13 on 2017-02-11, 23 on 2017-04-15,
  and 23 on 2017-06-17. The four unchanged codes are 0210, 0211, 0218 and 0219; no self-migrations are invented.
- Retrieval: manually read public HTML tables. The regulator's
  [Decision 2036/QĐ-BTTTT registry](https://mst.gov.vn/van-ban-phap-luat/13812.htm) confirms the underlying decision
  and issue date 2016-11-21; its scanned attachment is not used as machine-extracted evidence for table values.
- Date caution: the operator's narrative gives a contradictory phase-three parallel-dialing end date. It is not used.
  Calendar transition-start dates come from the phase headings, not an invented universal switch-off instant.
- Reuse: site states VNPT Hà Nội copyright. No open-content license identified; no editorial text or imagery copied.

### Coverage, names and date semantics

There are **63 ACTIVE and 59 LEGACY codes**, **59 mappings**, **63 telecom service areas**, and **34 reviewed groups**.
Stored codes include domestic trunk zero; source tables generally omit it. For example, 236 is stored as 0236.
The source-backed 0511 → 0236 transition starts on 2017-02-11; 04 → 024 and 08 → 028 start on 2017-06-17.
All 2025 temporarily parallel codes remain ACTIVE. A proposal to consolidate them is not an enacted migration.
The dataset is a dated review, not a guarantee that every subsequent official notice has been captured.

Names preserve the ministry table's source-era coverage, including “Bắc Cạn”, “Khánh Hoà” and “Thừa Thiên - Huế”.
The last area's group uses “Huế”, supported by the ministry's unchanged-locality paragraph. Names are not silently
rewritten into a current administrative register. The `TELECOM_SERVICE_AREA` context and separately sourced group
make this explicit in responses. Only useful HCM abbreviations and Huế are stored as aliases; accent-insensitive
normalization handles Da Nang/Đà Nẵng without inventing English names. English UI may use Vietnamese proper names.

Group `effectiveFrom` describes the reviewed 2025 telecom instruction, not the legal creation date of a province.
A legacy response's group is the reviewed contemporary grouping, not an assertion about its 2017 administration.
`effectiveDate` is a calendar transition-start date, stored as PostgreSQL DATE. Allocation starts for the four unchanged
codes and legacy switch-off dates remain null. Retrieval, publication and actual database/import clocks stay distinct.
No subscriber ownership, current subscriber location, line existence or network operator is inferred.

### Maintenance and import

Verify an official notice → update the structured file/new evidence UUIDs → validate → import/upsert → tests → update
source notes → commit. Run `pnpm --filter @tranhanh/api area-codes:validate`, then use `area-codes:import` only after
migrations and an explicit DATABASE_URL are configured. There is no runtime scraping or production fixture fallback.

Validation covers formats, dates, identities, source/locality/group relations, active allocations and complete same-area
legacy mappings. A transaction with an advisory lock upserts sources, references, groups, localities, codes and mappings.
Repeated imports preserve unchanged code timestamps. Omitted rows are retained. Immutable evidence needs a new UUID;
new review metadata can be attached without changing a grouping identity. Reassignment, group membership/name changes,
changed replacement targets and retirement of retained historical targets require explicit reviewed history work.
Routine additions, aliases and evidence refreshes do not require changing query-service logic.

The importer records RUNNING/SUCCEEDED/FAILED via the existing provider/sync audit infrastructure. Its maintainer provider
is not an official factual source. Failures roll back domain changes and emit only safe generic errors.
Live imports and PostgreSQL constraints remain pending while Docker is unavailable; memory tests do not prove them.

## Vehicle-plate allocation dataset — Phase 10

Reviewed on 2026-09-15. The versioned snapshot is `apps/api/data/vehicle-plates.json`: 81 active numeric
prefixes assigned to 34 current localities and Cục Cảnh sát giao thông. It also contains 29 source-backed
transitions from former allocation names, giving 64 retained allocation targets in total. This is a public
allocation table, not a registration, vehicle, owner, enforcement, or plate-validity database.

### Official sources and legal date

- Bộ Công an, [Thông tư 51/2025/TT-BCA and Appendix 02](https://bocongan.gov.vn/media/bca-media/photo-library/20250722155624_718a2904-71b2-4a66-a97a-ea695f49cbeb-TT51.2025.TT.BCA.pdf): issued 2025-06-30 and effective 2025-07-01. Appendix 02 supplies the current numeric-prefix allocation table.
- Cổng Thông tin điện tử Chính phủ, [official metadata for Thông tư 51/2025/TT-BCA](https://vanban.chinhphu.vn/?classid=1&docid=214486&pageid=27160&typegroupid=6): cross-checks document status and effective date. The query-bearing registry URL is documented but not stored as SourceReference because the current source-URL boundary rejects query strings.
- Cổng Thông tin điện tử Chính phủ, [full Thông tư 79/2024/TT-BCA](https://xaydungchinhsach.chinhphu.vn/toan-van-thong-tu-79-2024-tt-bca-quy-dinh-ve-cap-thu-hoi-chung-nhan-dang-ky-xe-bien-so-xe-co-gioi-xe-may-chuyen-dung-119250102193812924.htm): supplies the immediately preceding Appendix 02 allocation names. Its 2025-01-01 effective date is not treated as the beginning of every historical allocation, so history effectiveFrom remains null.
- Bộ Công an, [series and plate-colour explanation effective from 01/01/2025](https://bocongan.gov.vn/bai-viet/nhan-dien-mau-sac-seri-ky-hieu-bien-so-xe-cua-co-quan-to-chuc-ca-nhan-tu-01012025-d1-t1617): supplies public series/category semantics. It does not assign `K` or another series to a narrower locality within numeric code 51.

The review found no authoritative later instrument replacing the current Appendix 02 allocation as of 2026-09-15.
That is a review statement, not continuous synchronization. Recheck the official legal registries before a release that
requires current legal accuracy. No source document or article body is bundled. Only factual mappings, names, dates,
reference metadata, and attribution are retained. Government copyright/attribution is respected; no general open-content
license or permission to republish richer source content is claimed.

### Allocation, series, and history semantics

The current rows preserve every numeric code in Appendix 02. Examples include 29–33 and 40 for Hà Nội; 41, 50–59,
61 and 72 for TP. Hồ Chí Minh; 43 and 92 for Đà Nẵng; and 80 for Cục Cảnh sát giao thông. Target type therefore
explicitly distinguishes LOCALITY from CENTRAL_AUTHORITY. These target records are a dated vehicle-registration domain,
not canonical administrative units and not links into a general administrative hierarchy.

All current records have seriesPrefix null because the current locality table allocates the numeric prefix. Input such
as `51K` retains parsed public series `K`, resolves the sourced numeric code 51, and returns
seriesAllocationVerified=false. The schema can hold a future source-backed series-specific row; a numeric or series
lookup returns every matching allocation and sets ambiguous=true when several rows remain. It never chooses one target
arbitrarily. Series syntax follows the reviewed domestic series families and special `RM`; syntax does not establish an
allocation or a vehicle category.

The 29 history rows capture only codes whose former name differs from the current target: for example 61 Bình Dương →
TP. Hồ Chí Minh, 92 Quảng Nam → Đà Nẵng, and 98 Bắc Giang → Bắc Ninh. The previous allocation evidence and the
transition instrument are separate references. effectiveTo=2025-07-01 marks the allocation-table transition; it does
not invalidate an already issued plate or prove a vehicle moved. Unknown earlier start dates remain null.

### Privacy, validation, and import

Lookup accepts a two-digit numeric prefix, an optional one/two-character public series, or selected common full formats
such as `51K-123.45` and `51K 12345`. Normalization discards the registration serial before any database operation.
The server does not persist, log, return, enrich, or send full submitted plates to an external service. Responses state
resolution=NUMERIC_PREFIX_ALLOCATION and vehicleOrOwnerVerified=false. Successful lookup responses use no-store and
no-referrer headers. Deployment access logs/APM remain an operational boundary and must omit lookup query values.

Run `pnpm --filter @tranhanh/api vehicle-plates:validate` without a database. After applying migrations to an explicitly
confirmed database, run `vehicle-plates:import`. The importer validates the whole snapshot before writes, uses its own
advisory lock and SyncRun provider, and upserts in one domain transaction. Repeated identical imports preserve allocation
importedAt/updatedAt. It never deletes omitted rows, mutates evidence UUIDs, renames source-era targets, or silently
reassigns allocation identities. Such changes need new reviewed evidence/history.

The guarded PostgreSQL suite adds five Phase 10 cases for real idempotency/joins, scope uniqueness, foreign keys, CHECKs,
and RESTRICT history retention. They remain pending with the earlier 47 cases while Docker is unavailable. In-memory
fixtures and HTTP tests prove application decisions only, not database migration execution.

## National postal-code dataset — Phase 12

Reviewed 2026-09-15/16. The production snapshot is `apps/api/data/postal-codes.json`. It contains only factual names,
assignments, hierarchy, dates, anomaly notes and attribution; downloaded PDFs and editorial text are not committed.

### Current amendment and assignment table

- Publisher: Bộ Khoa học và Công nghệ, the competent national authority.
- System/document: [Decision 2334/QĐ-BKHCN and its official annex](https://mst.gov.vn/van-ban-phap-luat/25175.htm),
  “Danh mục Mã bưu chính quốc gia cho đối tượng là phường, xã và đơn vị hành chính tương đương”.
- Issued/effective: 2025-08-24; the official registry reports the decision remains effective.
- Extracted: 34 current province/city groupings and 3,321 listed ward, commune or equivalent targets after adoption of
  the two-tier local administration. Of these, 3,320 source values pass the official five-character format.
- Retrieval: downloaded the official annex PDF from the registry, extracted its tabular text, checked row sequences and
  target totals, manually reviewed anomalies, then converted only reviewed facts into versioned JSON.
- Reuse: ministry pages request attribution to mst.gov.vn. No general open-data license was identified, so the repository
  retains facts and source attribution only, without reproducing the PDF or editorial content.

### National five-character structure

- Publisher: Ministry authority and official national postal-code system.
- Sources: [Ministry explanation of Circular 07/2017/TT-BTTTT](https://mst.gov.vn/viet-nam-nhat-ban-trao-doi-kinh-nghiem-ve-ma-buu-chinh-197136691.htm),
  [Decision 2475/QĐ-BTTTT registry](https://mst.gov.vn/van-ban-phap-luat/14085.htm), and the
  [official lookup system](https://mabuuchinh.vn/).
- Effective baseline: Decision 2475 took effect 2018-01-01; Decision 2334 amends locality assignments from 2025-08-24.
- Extracted: national postal codes use five characters. The current official assignment annex uses decimal digits.
  Six-digit conventions and province-level shorthand seen on unrelated sites are not accepted as exact assignments.
- Retrieval: official registry/system review; last reviewed 2026-09-16.

### Official Hải Phòng anomaly resolution

- Publisher: Cổng thông tin điện tử Thành phố Hải Phòng.
- Document: [Danh mục mã bưu chính của các xã, phường, đặc khu](https://cdn.haiphong.gov.vn/gov-hpg/6807/tintuc/2025/9/ma-buu-chinh-cac-xa-phuong-tren-dia-ban-thanh-pho638938022577286985.pdf).
- Extracted: the central annex's `#VALUE!` cell for code 05127 is Xã Nghi Dương.
- Retrieval: official city PDF cross-check; last reviewed 2026-09-15. No general reuse license identified.

### Coverage, anomaly and maintenance policy

The snapshot has 3,355 targets: 34 province/city parents, 2,621 communes, 687 wards and 13 special zones. It has 3,320
active assignments. The central annex prints `152213` for Xã Tam Dương Bắc, which conflicts with the binding five-character
structure. No official correction was located during review. The target is retained with a structured anomaly and no code
assignment; the importer refuses silent omission or truncation. This limitation must remain visible until official evidence
supports a correction.

Update workflow: review an official change → update/new evidence UUID → edit structured JSON → validate → apply additive
migration if needed → import/upsert → tests → documentation → commit. Imports do not delete omitted rows. Run
`pnpm postal-codes:validate`; after migrations and an explicit `DATABASE_URL`, run `pnpm postal-codes:import`.
