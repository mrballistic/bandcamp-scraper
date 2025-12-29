import { useState, useCallback, useEffect } from 'react';
import { PurchaseRow, ScrapeProgress } from '../types/bandcamp';
import { normalizeItem, deduplicateRows } from '../services/bandcamp.service';

export function useBandcampScraper() {
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [progress, setProgress] = useState<ScrapeProgress>({
    status: 'idle',
    itemsFetched: 0,
    pagesFetched: 0,
  });

  // Load initial data from persistence
  useEffect(() => {
    const saved = localStorage.getItem('bc_scraper_rows');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRows(parsed);
        setProgress(prev => ({ ...prev, status: 'completed', itemsFetched: parsed.length }));
      } catch (e) {
        console.error('Failed to load saved data:', e);
      }
    }
  }, []);

  // Save data to persistence
  useEffect(() => {
    if (rows.length > 0) {
      localStorage.setItem('bc_scraper_rows', JSON.stringify(rows));
    }
  }, [rows]);

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

      if (summaryRes.status === 401) {
        throw new Error('Your Identity cookie is invalid or has expired. Please log in to Bandcamp and get a fresh cookie.');
      }

      if (!summaryRes.ok) {
        throw new Error(summaryData.error || 'Failed to authenticate');
      }

      const { fanId, collectionCount, raw, cookieToUse } = summaryData;
      
      const sessionCookie = cookieToUse || identityCookie;

      let allRows: PurchaseRow[] = [];
      let pageCount = 0;
      let moreAvailable = true;
      let olderThanToken = null;

      // Some versions of the API provide the initial token in the summary
      if (raw && raw.collection_data && raw.collection_data.last_token) {
        olderThanToken = raw.collection_data.last_token;
      }

      console.log(`Starting scrape for Fan ${fanId}. Total expected: ${collectionCount}`);

      // 2. Progressive Paging Loop
      while (moreAvailable) {
        // For the very first page, we start with a high-timestamp token 
        // which matches how the Bandcamp website initiates a scroll fetch.
        let currentToken = olderThanToken;
        if (pageCount === 0 && currentToken === null) {
          currentToken = `${Math.floor(Date.now() / 1000)}::p:1:`;
        }

        let itemsRes: Response = await fetch('/api/bandcamp/collection-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identityCookie: sessionCookie, fanId, olderThanToken: currentToken, count: 50 }),
        });

        let data = await itemsRes.json();

        // If the specific token pass returns 0 items, retry with a null token
        if (pageCount === 0 && (!data.items || data.items.length === 0) && currentToken !== null) {
          console.log('[Scraper] Retry first page with null token...');
          itemsRes = await fetch('/api/bandcamp/collection-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identityCookie: sessionCookie, fanId, olderThanToken: null, count: 50 }),
          });
          data = await itemsRes.json();
        }

        if (!itemsRes.ok) {
          throw new Error(data.error || `Failed to fetch items (${itemsRes.status})`);
        }

        if (!data.items || !Array.isArray(data.items)) {
          console.error('Unexpected items response:', data);
          // If we have some rows, maybe just stop here instead of crashing
          if (allRows.length > 0) {
            break;
          }
          throw new Error('API returned no items. Your session might be restricted or some metadata is incorrect.');
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

        moreAvailable = data.moreAvailable && data.nextOlderThanToken;
        olderThanToken = data.nextOlderThanToken;

        // Safety break
        if (pageCount > 500) break; 
      }

      // 3. Optional pass for Hidden Items
      moreAvailable = true;
      olderThanToken = null;

      while (moreAvailable) {
        const hiddenRes: Response = await fetch('/api/bandcamp/hidden-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identityCookie: sessionCookie, fanId, olderThanToken, count: 50 }),
        });

        const data = await hiddenRes.json();

        if (!hiddenRes.ok) {
          // If hidden items fail, we don't necessarily want to crash the whole thing
          console.error('Failed to fetch hidden items:', data.error);
          break;
        }

        if (!data.items || data.items.length === 0) break;

        const newRows = data.items.map(normalizeItem);
        allRows = [...allRows, ...newRows];
        pageCount++;

        setRows(deduplicateRows([...allRows]));
        setProgress((prev) => ({
          ...prev,
          itemsFetched: allRows.length,
          pagesFetched: pageCount,
        }));

        moreAvailable = data.moreAvailable;
        olderThanToken = data.nextOlderThanToken;
        
        if (pageCount > 1000) break; // Extended safety break
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
    localStorage.removeItem('bc_scraper_rows');
  }, []);

  return { rows, progress, startScrape, reset };
}
