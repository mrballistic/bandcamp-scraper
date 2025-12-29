import { BandcampItem, PurchaseRow, PreorderStatus } from '../types/bandcamp';

/**
 * Converts a raw Bandcamp API item into the normalized `PurchaseRow` shape
 * used by the UI and exporters.
 *
 * The function also:
 * - Stabilizes the item type into a human readable label.
 * - Builds a deterministic purchase key for deduplication.
 * - Detects preorder status and fills in placeholder values.
 * - Generates a thumbnail-friendly art URL (or a fallback if none exists).
 *
 * @param item - Raw Bandcamp item from either the collection or hidden items endpoints.
 * @param isHidden - Whether the item came from the hidden items feed (affects the `isHidden` flag).
 * @returns A fully-populated `PurchaseRow` ready for rendering or export.
 */
export function normalizeItem(item: BandcampItem, isHidden = false): PurchaseRow {
  const itemTypeMap: Record<string, 'album' | 'track' | 'package' | 'unknown'> = {
    'a': 'album',
    't': 'track',
    'p': 'package',
  };

  const itemType = itemTypeMap[item.item_type] || 'unknown';
  
  // Stable key: type:id:purchaseDate
  const purchaseDate = item.purchased || item.purchase_date || null;
  const purchaseKey = `${item.item_type}:${item.item_id}:${purchaseDate || 'unknown'}`;

  // Preorder detection (Best-effort)
  const isPreorder = !!item.is_preorder;
  let preorderStatus: PreorderStatus = 'unknown';

  if (isPreorder) {
    preorderStatus = item.preorder_status || 'unreleased';
  }

  // Infer from title/metadata if possible? 
  // (Placeholder for future Tier B/C logic)

  // Art URL construction
  // a: album/track, p: physical/package
  // a<art_id>_10.jpg is a common thumbnail size (100x100)
  // a<art_id>_16.jpg is larger (700x700)
  // a<art_id>_2.jpg is original
  const artUrl = item.art_id 
    ? `https://f4.bcbits.com/img/a${item.art_id}_10.jpg` 
    : '/no-art.png';

  return {
    purchaseKey,
    purchaseDate,
    itemType,
    itemId: item.item_id,
    title: item.item_title,
    artist: item.band_name,
    itemUrl: item.item_url,
    artUrl,
    isPreorder,
    preorderStatus,
    rawItem: item,
    isHidden,
  };
}

/**
 * Removes duplicate purchase rows based on their computed `purchaseKey`.
 *
 * The rows are filtered in-place order, so the first occurrence of a key is
 * retained while subsequent duplicates are discarded. This is useful when
 * merging results from multiple Bandcamp sources (public collection + hidden
 * items) that may overlap.
 *
 * @param rows - Array of purchase rows to deduplicate.
 * @returns A new array containing only the first instance of each purchase key.
 */
export function deduplicateRows(rows: PurchaseRow[]): PurchaseRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.purchaseKey)) return false;
    seen.add(row.purchaseKey);
    return true;
  });
}
