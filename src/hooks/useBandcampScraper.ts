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

      const { fanId, usernameSlug, cookieToUse } = summaryData;
      
      const sessionCookie = cookieToUse || identityCookie;

      let allRows: PurchaseRow[] = [];

      console.log(`Starting HTML scrape for Fan ${fanId} (${usernameSlug || 'no slug'})...`);

      // 2. Single HTML Scrape (gets all items at once)
      const itemsRes: Response = await fetch('/api/bandcamp/collection-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          identityCookie: sessionCookie, 
          fanId,
          usernameSlug 
        }),
      });

      const data = await itemsRes.json();

      if (!itemsRes.ok) {
        throw new Error(data.error || `Failed to fetch items (${itemsRes.status})`);
      }

      if (!data.items || !Array.isArray(data.items)) {
        console.error('Unexpected items response:', data);
        throw new Error('Could not parse collection from page. Your collection might be private.');
      }

      console.log(`[Scraper] Found ${data.items.length} items in collection`);
      
      const newRows = data.items.map(normalizeItem);
      allRows = [...allRows, ...newRows];
      
      setRows(deduplicateRows([...allRows]));
      setProgress({
        status: 'completed',
        itemsFetched: allRows.length,
        pagesFetched: 1,
      });

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
