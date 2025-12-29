/**
 * Shape of the lightweight summary returned by Bandcamp after authenticating
 * a fan. This is used to confirm the cookie works and to pull the numeric
 * identifier required for deeper scraping.
 */
export interface BandcampSummaryResponse {
  /** Unique numeric identifier for the fan account. */
  fan_id: number;
  /** Total number of items Bandcamp reports for the fan's collection. */
  collection_count: number;
  /** Public-facing username/slug, if available. */
  username: string;
  /** Display name as shown on Bandcamp. */
  name: string;
  // Add other fields if needed
}

/**
 * Raw representation of a single item as returned by Bandcamp collection APIs.
 * Some properties are optional or vary between endpoints, so downstream code
 * should be defensive when accessing them.
 */
export interface BandcampItem {
  /** Internal ID for the record in Bandcamp's system. */
  id: number;
  /** Higher-level item classification. */
  type: "album" | "track" | "package";
  /** Item ID used for links and de-duplication. */
  item_id: number;
  /** Abbreviated type key used by Bandcamp APIs. */
  item_type: "a" | "t" | "p";
  /** Artist or band name. */
  band_name: string;
  /** Title of the album/track/package. */
  item_title: string;
  /** URL to the item's Bandcamp page. */
  item_url: string;
  /** Artwork identifier; can be used to build an image URL. */
  art_id: number;
  /** Purchase date string (often GMT formatted). */
  purchase_date?: string;
  /** Alternate purchase timestamp property used by hidden items API. */
  purchased?: string;
  /** Whether the item is a preorder (not yet released). */
  is_preorder?: boolean;
  /** Release status for preorder items. */
  preorder_status?: "unreleased" | "released" | "unknown";
  // tracklist information might be in a separate field in the response
}

/**
 * Container returned from the collection endpoints when batching items.
 */
export interface BandcampItemsResponse {
  /** Array of raw Bandcamp items. */
  items: BandcampItem[];
  /** Indicates if more pages/tokens are available. */
  more_available: boolean;
  /** Token for fetching the next page of collection items. */
  last_token: string;
  /** Optional mapping of tracklists returned with the payload. */
  tracklists?: Record<string, unknown>;
}

/** Normalized set of preorder states recognized by the UI. */
export type PreorderStatus = "unreleased" | "released" | "unknown";

/**
 * Data model used by the UI table and export flows. This is a normalized,
 * sanitized representation of `BandcampItem` plus UI-specific metadata.
 */
export interface PurchaseRow {
  /** Stable key combining type, ID, and purchase date for deduplication. */
  purchaseKey: string;
  /** Purchase timestamp or null when unavailable. */
  purchaseDate: string | null;
  /** User-friendly item type label. */
  itemType: "album" | "track" | "package" | "unknown";
  /** Identifier surfaced to users; may be string or number depending on source. */
  itemId: number | string;
  /** Title suitable for display. */
  title: string;
  /** Artist or label name. */
  artist: string;
  /** Optional label metadata if present. */
  label?: string;
  /** Direct link to the item. */
  itemUrl: string;
  /** Thumbnail-sized artwork URL or fallback placeholder. */
  artUrl: string;
  /** Whether the item is a preorder. */
  isPreorder: boolean;
  /** Release status for preorder items. */
  preorderStatus: PreorderStatus;
  /** Optional release date when known. */
  releaseDate?: string;
  /** Original raw record for debugging or export. */
  rawItem?: unknown;
  /** Flag indicating the item was fetched from the hidden feed. */
  isHidden?: boolean;
}

/**
 * Progress metadata emitted by the scraper hook so UI components can render
 * status, progress indicators, and error states.
 */
export interface ScrapeProgress {
  /** Current lifecycle stage for the scraper. */
  status: "idle" | "scraping" | "completed" | "error";
  /** Total items fetched so far. */
  itemsFetched: number;
  /** Total Bandcamp pages/token batches processed. */
  pagesFetched: number;
  /** Optional human-readable error message. */
  error?: string;
}
