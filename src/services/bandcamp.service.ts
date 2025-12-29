import { BandcampItem, PurchaseRow, PreorderStatus } from '../types/bandcamp';

/**
 * Normalizes a raw Bandcamp item into a PurchaseRow.
 */
export function normalizeItem(item: BandcampItem): PurchaseRow {
  const itemTypeMap: Record<string, 'album' | 'track' | 'package' | 'unknown'> = {
    'a': 'album',
    't': 'track',
    'p': 'package',
  };

  const itemType = itemTypeMap[item.item_type] || 'unknown';
  
  // Stable key: type:id:purchaseDate
  const purchaseKey = `${item.item_type}:${item.item_id}:${item.purchase_date}`;

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
    purchaseDate: item.purchase_date,
    itemType,
    itemId: item.item_id,
    title: item.item_title,
    artist: item.band_name,
    itemUrl: item.item_url,
    artUrl,
    isPreorder,
    preorderStatus,
    rawItem: item,
  };
}

/**
 * Deduplicates rows by purchaseKey.
 */
export function deduplicateRows(rows: PurchaseRow[]): PurchaseRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.purchaseKey)) return false;
    seen.add(row.purchaseKey);
    return true;
  });
}
