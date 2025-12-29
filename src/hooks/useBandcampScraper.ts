import { useState, useCallback } from 'react';
import { PurchaseRow, ScrapeProgress } from '../types/bandcamp';
import { normalizeItem, deduplicateRows } from '../services/bandcamp.service';

export function useBandcampScraper() {
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [progress, setProgress] = useState<ScrapeProgress>({
    status: 'idle',
    itemsFetched: 0,
    pagesFetched: 0,
  });

  const startScrape = useCallback(async (identityCookie: string) => {
    setProgress({ status: 'scraping', itemsFetched: 0, pagesFetched: 0 });
    setRows([]);

    try {
      // 1. Get Summary (Auth test + Fan ID)
      const summaryRes: Response = await fetch('/api/bandcamp/collection-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityCookie }),
      });

      const summaryData = await summaryRes.json();

      if (!summaryRes.ok) {
        throw new Error(summaryData.error || 'Failed to authenticate');
      }

      const { fanId } = summaryData;

      let moreAvailable = true;
      let olderThanToken = null;
      let allRows: PurchaseRow[] = [];
      let pageCount = 0;

      // 2. Progressive Paging Loop
      while (moreAvailable) {
        const itemsRes: Response = await fetch('/api/bandcamp/collection-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identityCookie, fanId, olderThanToken, count: 50 }),
        });

        const data = await itemsRes.json();

        if (!itemsRes.ok) {
          throw new Error(data.error || 'Failed to fetch items');
        }

        const newRows = data.items.map(normalizeItem);
        
        allRows = [...allRows, ...newRows];
        pageCount++;
        
        // Update state progressively
        setRows(deduplicateRows([...allRows]));
        setProgress((prev) => ({
          ...prev,
          itemsFetched: allRows.length,
          pagesFetched: pageCount,
        }));

        moreAvailable = data.moreAvailable;
        olderThanToken = data.nextOlderThanToken;

        // Safety break to prevent infinite loops in case of API weirdness
        if (pageCount > 500) break; 
      }

      setProgress((prev) => ({ ...prev, status: 'completed' }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Scrape error:', err);
      setProgress((prev) => ({
        ...prev,
        status: 'error',
        error: errorMessage,
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setRows([]);
    setProgress({ status: 'idle', itemsFetched: 0, pagesFetched: 0 });
  }, []);

  return { rows, progress, startScrape, reset };
}
