import { describe, it, expect } from 'vitest';
import { normalizeItem, deduplicateRows } from './bandcamp.service';
import { BandcampItem, PurchaseRow } from '../types/bandcamp';

describe('bandcamp.service', () => {
  describe('normalizeItem', () => {
    it('should correctly normalize a standard album item', () => {
      const mockItem: BandcampItem = {
        id: 1,
        type: 'album',
        item_id: 12345,
        item_type: 'a',
        band_name: 'The Band',
        item_title: 'The Album',
        item_url: 'https://theband.bandcamp.com/album/the-album',
        art_id: 67890,
        purchase_date: '01 Jan 2024 00:00:00 GMT',
        is_preorder: false,
      };

      const result = normalizeItem(mockItem);

      expect(result.purchaseKey).toBe('a:12345:01 Jan 2024 00:00:00 GMT');
      expect(result.itemType).toBe('album');
      expect(result.artist).toBe('The Band');
      expect(result.title).toBe('The Album');
      expect(result.artUrl).toBe('https://f4.bcbits.com/img/a67890_10.jpg');
      expect(result.isPreorder).toBe(false);
    });

    it('should correctly handle preorders', () => {
      const mockItem: BandcampItem = {
        id: 2,
        type: 'album',
        item_id: 54321,
        item_type: 'a',
        band_name: 'Future Band',
        item_title: 'Upcoming Album',
        item_url: 'https://futureband.bandcamp.com/album/upcoming',
        art_id: 11111,
        purchase_date: '28 Dec 2025 00:00:00 GMT',
        is_preorder: true,
        preorder_status: 'unreleased',
      };

      const result = normalizeItem(mockItem);

      expect(result.isPreorder).toBe(true);
      expect(result.preorderStatus).toBe('unreleased');
    });

    it('should fallback to unknown for invalid item type', () => {
       const mockItem = {
        item_id: 999,
        item_type: 'z',
        band_name: 'X',
        item_title: 'Y',
        purchase_date: 'now'
      } as unknown as BandcampItem;

      const result = normalizeItem(mockItem);
      expect(result.itemType).toBe('unknown');
    });

    it('should handle missing art_id', () => {
      const mockItem = {
        item_id: 999,
        item_type: 'a',
        band_name: 'X',
        item_title: 'Y',
        purchase_date: 'now',
        art_id: null
      } as unknown as BandcampItem;

      const result = normalizeItem(mockItem);
      expect(result.artUrl).toBe('/no-art.png');
    });
  });

  describe('deduplicateRows', () => {
    it('should remove duplicate items based on purchaseKey', () => {
      const rows: Partial<PurchaseRow>[] = [
        { purchaseKey: 'a:1:d1' },
        { purchaseKey: 'a:2:d1' },
        { purchaseKey: 'a:1:d1' }, // Duplicate
      ];

      const result = deduplicateRows(rows as PurchaseRow[]);
      expect(result).toHaveLength(2);
      expect(result[0].purchaseKey).toBe('a:1:d1');
      expect(result[1].purchaseKey).toBe('a:2:d1');
    });

    it('should return empty array for empty input', () => {
      expect(deduplicateRows([])).toEqual([]);
    });
  });
});
