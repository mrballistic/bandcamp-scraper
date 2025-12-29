## PRD — Bandcamp Purchases Exporter (Next.js + Vercel + MUI X Data Grid Community)

### 1) Overview

A lightweight web app that lets a user authenticate to **their own Bandcamp fan account**, scrape **purchases only** from their collection, review the scraped data in a **MUI X Data Grid (Community)** table, and export results to **JSON and/or CSV**. The app should also **highlight pre-orders that have not been fully released/supplied yet** (best-effort based on available metadata).

**Why this approach:** Bandcamp’s official API access is aimed at labels/partners and uses OAuth 2.0; it is not a general “fan purchases export” API. ([Bandcamp][1])
Instead, the solution relies on Bandcamp’s **site JSON endpoints** used by the web app (unofficial), which commonly require the **Identity** cookie. ([GitHub Wiki][2])

---

### 2) Goals

- Export a complete, deduplicated list of **purchased items** from the user’s Bandcamp collection.
- Provide a **review screen** (filter/sort/search) before export using **MUI X Data Grid Community (MIT-licensed, free forever)**. ([MUI][3])
- Include **album art / cover image URLs** (and item URLs) as “pointers” (no media downloads). ([GitHub Wiki][2])
- Identify and **flag “unreleased / unsupplied preorders”** (best-effort; see preorder section).

### 3) Non-goals

- Downloading audio files or managing a local music library.
- Wishlist scraping, follows, recommendations, listening history.
- Band/label seller data (orders, fulfillment).
- Guaranteed long-term stability of Bandcamp endpoints (they are unofficial and may change).

---

### 4) Target users & key use cases

**Primary user:** A Bandcamp fan who wants an export of purchases for backup/organization.

**Top use cases**

1. Paste session token/cookie → scrape purchases → preview table → export CSV.
2. Same as above → export detailed JSON including tracklist pointers when available.
3. Filter to “preorders not yet released” and export that subset.

---

### 5) Scope and requirements

#### 5.1 Functional requirements (Must-have)

**Auth / Session**

- Provide an authentication mechanism that **does not require the user to enter their Bandcamp password** into the app.
- App accepts a user-provided **Bandcamp session cookie value** (e.g., Identity cookie) and uses it only for scraping. (Cookie-based access is described as required by common reverse-engineered endpoints.) ([GitHub Wiki][2])

**Scrape**

- Fetch a **collection summary** to obtain fan identifiers and collection metadata. ([GitHub Wiki][2])
- Fetch collection “items” in pages until complete; must support pagination/continuation. ([GitHub Wiki][2])
- Include (at minimum) these fields per purchase:

  - Item ID, item type (album/track/package where available)
  - Artist name, title
  - Purchase date/time (when provided)
  - Item URL
  - Cover/album art URL(s)
  - Labels like “hidden” (if detectable), “preorder”, and “preorder_status”

- Purchases-only filter:

  - Exclude non-purchase entities (e.g., follows/wishlist)
  - Exclude non-owned items
  - Include **preorders** as purchases, but flag if not released

**Preview**

- After scraping, show a single-table view using **MUI X Data Grid Community** with:

  - Column sorting, filtering, quick search
  - Pagination/virtualization appropriate for large datasets
  - Row click → details drawer/modal (optional) showing expanded fields (tracklist pointers, raw JSON snippet)

- Data Grid Community is acceptable and free; Pro/Premium features are out of scope. ([MUI][3])

**Export**

- Export **CSV** (“flat” purchase rows).
- Export **JSON** (structured; can include tracklist pointers and additional metadata).
- Allow exporting:

  - Full dataset
  - Filtered dataset (based on the current Data Grid filters)

- Provide an option to include/exclude “verbose fields” (like tracklists) to keep file sizes manageable.

#### 5.2 Functional requirements (Nice-to-have)

- Persist scraped data locally (IndexedDB) so the user can reload the view without re-scraping (cookie not stored).
- A small “preorders dashboard” view (counts + list).

---

### 6) Preorder highlighting requirements

**Definition (user-facing):**

- “Preorder (Unreleased)” = purchased item whose release is not yet available, so the user hasn’t received the full album download yet.

**Detection approach (best-effort):**

- Use a direct preorder flag if present in the scraped item payload.
- If not present, infer using a release date in item/album metadata (future date), or other signals discovered during implementation.
- Bandcamp’s own preorder behavior: fans can receive some tracks immediately, and then get the full album when released. ([Bandcamp Help Center][4])

---

### 7) Non-functional requirements

**Privacy & security**

- Do not store Bandcamp session cookie server-side.
- Do not log the cookie value.
- Transmit cookie to server only over HTTPS and only for proxying Bandcamp requests.
- Explicit “data stays with you” messaging (with accurate constraints).

**Performance**

- Handle large collections by paging and incremental client-side aggregation.
- Avoid server responses that exceed platform limits (e.g., function payload size). Vercel calls out a 4.5MB body size limit for Serverless Functions and recommends streaming/paging to avoid payload-too-large errors. ([Vercel][5])

**Reliability**

- Retry with backoff on transient failures.
- Clear error states when auth fails (expired cookie, invalid cookie).

**Accessibility**

- Keyboard navigation and screen reader-friendly table configuration.

---

### 8) Success metrics

- ≥ 99% of purchases returned compared to Bandcamp “collection count” (when available).
- Time-to-first-rows in UI < 5 seconds for typical collections (paging + progressive rendering).
- Export completes successfully for collections of at least several thousand purchases without hitting server payload limits.

---

### 9) Risks & mitigations

- **Unofficial endpoint breakage:** endpoints/cookies may change. Mitigation: isolate all Bandcamp calls in a single module; add fixture-based tests; show “endpoint updated” error messaging. ([GitHub Wiki][2])
- **Cookie sensitivity / trust:** Mitigation: no password collection; no persistence; clear disclosure.
- **Payload size limits:** Mitigation: paging + client aggregation; optional “omit verbose fields”. ([Vercel][5])
- **Hidden items behavior:** Summary may include items not returned by the main item endpoint; plan for a hidden-items pass if needed (Bandcamp tooling in the wild references a `hidden_items` endpoint). ([GitHub Wiki][6])

---

### 10) Milestones

1. **MVP**

   - Cookie input → scrape purchases → Data Grid preview → CSV/JSON export

2. **Preorder pass**

   - Flag unreleased preorders + filter toggle

3. **Polish**

   - Details drawer, saved dataset (IndexedDB), better error UX, tests

---

<br>

## Design Document — Bandcamp Purchases Exporter

### 1) Summary

We will build a Next.js (App Router) web app deployed on Vercel. The app proxies Bandcamp requests through Next.js API routes because client-side direct calls are likely to be blocked by browser restrictions/CORS. The client performs paging, normalizes results into a flat purchase list, renders it in MUI X Data Grid Community, and exports user-selected subsets.

---

### 2) Key constraints & data sources

**Official Bandcamp API**

- Intended for labels and fulfillment partners; uses OAuth 2.0. ([Bandcamp][1])
- Not relied upon for fan purchase exports.

**Unofficial (site) endpoints**

- Common reverse-engineered flow:

  - GET `https://bandcamp.com/api/fan/2/collection_summary` (summary)
  - POST `https://bandcamp.com/api/fancollection/1/collection_items` (paged items)

- These endpoints are described as requiring the **Identity cookie**. ([GitHub Wiki][2])
- The “Item endpoint” response is described as including cover art URLs and tracklists, and supports paging via `older_than_token` + `more_available`. ([GitHub Wiki][2])

**Hidden items**

- Summary may include items not returned by item endpoint when hidden; a hidden endpoint is referenced in existing tooling (`/api/fancollection/1/hidden_items`). ([GitHub Wiki][6])

---

### 3) Architecture

**High-level**

- **Client (Next.js + React + MUI):**

  - Cookie input + scrape controls
  - Progressive ingestion loop (page-by-page)
  - In-memory normalized store (optionally persisted to IndexedDB)
  - MUI X Data Grid Community for preview ([MUI][3])
  - Export generator (CSV, JSON) → browser download

- **Server (Next.js Route Handlers):**

  - `/api/bandcamp/collection-summary` → proxy GET
  - `/api/bandcamp/collection-items` → proxy POST
  - `/api/bandcamp/hidden-items` (optional) → proxy POST
  - These routes accept cookie via request body/headers, attach it as `Cookie` to Bandcamp, return only required JSON fields to client.

**Why paging matters on Vercel**

- Avoid large responses and body limits; Vercel documents a 4.5MB body size limit and recommends streaming/paging. ([Vercel][5])

---

### 4) Authentication / session handling

**Approach**

- User logs into Bandcamp separately.
- User provides a session token value (Identity cookie) to the app.
- The app uses it _only_ to call proxy routes during scraping.

**Security rules**

- Cookie lives only in client memory by default (React state).
- Never persist cookie to localStorage/IndexedDB.
- Mask cookie in UI; provide “clear session” button that wipes all in-memory state.
- Server routes must:

  - Disable all request logging of bodies where feasible (and never `console.log` the cookie).
  - Set `Cache-Control: no-store` headers.
  - Return sanitized errors.

---

### 5) API routes (internal)

#### `POST /api/bandcamp/collection-summary`

**Request**

```json
{ "identityCookie": "..." }
```

**Response (example)**

```json
{
  "fanId": 8124620,
  "username": "todd",
  "raw": { "...": "optional subset" }
}
```

#### `POST /api/bandcamp/collection-items`

**Request**

```json
{
  "identityCookie": "...",
  "fanId": 8124620,
  "olderThanToken": "1893456000::a::",
  "count": 100
}
```

**Response (pass-through subset)**

```json
{
  "items": [
    /* item objects */
  ],
  "tracklists": {
    /* map */
  },
  "moreAvailable": true,
  "nextOlderThanToken": "..."
}
```

#### `POST /api/bandcamp/hidden-items` (optional)

Mirrors the approach for hidden items if needed. Endpoint referenced by other Bandcamp tooling. ([GitHub][7])

---

### 6) Scrape algorithm (client)

1. Call `collection-summary` to get `fanId` and seed tokens.
2. Initialize:

   - `olderThanToken = farFutureTimestampToken()` (or token derived from summary; implementation-specific)
   - `count = 100` (tunable)

3. Loop:

   - Call `collection-items` with `(fanId, olderThanToken, count)`
   - Normalize items → append to store
   - Update `olderThanToken` to returned `nextOlderThanToken` (or derive from last item)
   - Stop when `moreAvailable === false`

4. (Optional) call `hidden-items` and merge results.
5. Deduplicate by stable key (e.g., `${itemType}:${itemId}:${purchaseDate}`).

Note: The bandcamp-api-docs describe `more_available` and `older_than_token` paging behavior. ([GitHub Wiki][6])

---

### 7) Data model

#### 7.1 Normalized “PurchaseRow” (for Data Grid + CSV)

- `purchaseKey` (string, stable)
- `purchaseDate` (ISO string | null)
- `itemType` (enum-ish: album | track | package | unknown)
- `itemId` (number/string)
- `title`
- `artist`
- `label` (optional)
- `itemUrl`
- `artUrl` (best available)
- `isPreorder` (boolean)
- `preorderStatus` (enum: `unreleased` | `released` | `unknown`)
- `releaseDate` (optional)
- `rawRef` (pointer into raw JSON store, optional)

#### 7.2 Detailed JSON export

```json
{
  "exportedAt": "2025-12-28T...",
  "username": "...",
  "purchases": [
    {
      "purchaseRow": { ... },
      "tracklist": [ ...optional pointers... ],
      "rawItem": { ...optional... }
    }
  ]
}
```

---

### 8) Preorder detection logic (best-effort)

Because preorder flags/fields can vary, implement a tiered strategy:

**Tier A: Explicit preorder metadata**

- If item payload contains a boolean like `is_preorder` / `preorder` → use it.
- If release date field exists and is in the future → `preorderStatus = unreleased`.

**Tier B: Parse from item/album page metadata (fallback)**

- If no preorder flag exists, optionally fetch the album/track page HTML (server-side proxy) and parse embedded JSON (e.g., `data-tralbum`) for release date.
- If release date is in the future → treat as preorder unreleased.

**Tier C: “Supply” inference**

- If the item indicates partial availability only (e.g., limited tracklist) mark as preorder unknown/unreleased (conservative).

Bandcamp describes that preorders can deliver some tracks immediately and the full album at release, which aligns with the UX expectation of “unsupplied until release.” ([Bandcamp Help Center][4])

---

### 9) UI design (MUI + MUI X)

**Pages**

1. **Home / Scrape**

   - Cookie input
   - “Test auth” button
   - “Scrape purchases” button
   - Progress indicator: items fetched, pages fetched, errors/retries

2. **Review**

   - **MUI X Data Grid (Community)** with:

     - Search box (quick filter)
     - Column filters
     - Toggle “Show unreleased preorders”
     - Export buttons (CSV / JSON)

   - Data Grid Community is MIT-licensed and “free forever.” ([MUI][3])

**Data Grid columns (default)**

- Art (thumbnail)
- Artist
- Title
- Type
- Purchase date
- Preorder status
- Item URL (clickable)

---

### 10) Export implementation

**CSV**

- Build from the currently-filtered rows.
- Escape and quote correctly.
- Download via Blob.

**JSON**

- Two modes:

  - “Flat JSON” (PurchaseRow only) for portability
  - “Detailed JSON” (includes optional tracklist pointers/raw subsets)

Avoid Excel export reliance (premium feature); implement CSV directly.

---

### 11) Performance considerations

- Progressive rendering: add rows as they’re fetched.
- Keep “raw” payload optional; default to storing only required fields to reduce memory.
- Provide “include tracklists in export” checkbox (off by default).

---

### 12) Testing plan

- Unit tests:

  - Normalization and dedupe functions
  - CSV exporter correctness
  - Preorder logic (fixture-driven)

- Integration tests:

  - Proxy route error handling (401/403, malformed cookie)
  - Paging loop terminates correctly on `more_available=false`. ([GitHub Wiki][6])

[1]: https://bandcamp.com/developer "Bandcamp API | Bandcamp"
[2]: https://github-wiki-see.page/m/har-nick/bandcamp-api-docs/wiki/API-Endpoints " API Endpoints - har-nick/bandcamp-api-docs GitHub Wiki "
[3]: https://mui.com/x/react-data-grid/ "React Data Grid component - MUI X"
[4]: https://get.bandcamp.help/hc/en-us/articles/23020726517015-How-do-I-set-up-a-pre-order?utm_source=chatgpt.com "How do I set up a pre-order? - Bandcamp Help Center"
[5]: https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions "How do I bypass the 4.5MB body size limit of Vercel Serverless Functions? | Vercel Knowledge Base"
[6]: https://github-wiki-see.page/m/har-nick/bandcamp-api-docs/wiki/API-Data-and-Its-Usages " API Data and Its Usages - har-nick/bandcamp-api-docs GitHub Wiki "
[7]: https://github.com/easlice/bandcamp-downloader/blob/master/bandcamp-downloader.py?utm_source=chatgpt.com "bandcamp-downloader/bandcamp-downloader.py at master · easlice/bandcamp ..."
