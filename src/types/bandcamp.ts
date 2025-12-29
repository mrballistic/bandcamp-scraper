export interface BandcampSummaryResponse {
  fan_id: number;
  collection_count: number;
  username: string;
  name: string;
  // Add other fields if needed
}

export interface BandcampItem {
  id: number;
  type: "album" | "track" | "package";
  item_id: number;
  item_type: "a" | "t" | "p";
  band_name: string;
  item_title: string;
  item_url: string;
  art_id: number;
  purchase_date: string;
  is_preorder?: boolean;
  preorder_status?: "unreleased" | "released" | "unknown";
  // tracklist information might be in a separate field in the response
}

export interface BandcampItemsResponse {
  items: BandcampItem[];
  more_available: boolean;
  last_token: string;
  tracklists?: Record<string, unknown>;
}

export type PreorderStatus = "unreleased" | "released" | "unknown";

export interface PurchaseRow {
  purchaseKey: string;
  purchaseDate: string | null;
  itemType: "album" | "track" | "package" | "unknown";
  itemId: number | string;
  title: string;
  artist: string;
  label?: string;
  itemUrl: string;
  artUrl: string;
  isPreorder: boolean;
  preorderStatus: PreorderStatus;
  releaseDate?: string;
  rawItem?: unknown;
}

export interface ScrapeProgress {
  status: "idle" | "scraping" | "completed" | "error";
  itemsFetched: number;
  pagesFetched: number;
  error?: string;
}
