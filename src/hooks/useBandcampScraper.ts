import { useState, useCallback, useEffect } from 'react';
import { PurchaseRow, ScrapeProgress, BandcampItem } from '../types/bandcamp';
import { normalizeItem, deduplicateRows } from '../services/bandcamp.service';

/**
 * Custom hook that orchestrates the client-side scraping workflow. It manages
 * normalized rows, progress tracking, persistence to localStorage, and exposes
 * imperative actions to start or reset the scrape.
 */
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

  /**
   * Initiates the scraping process by validating the supplied cookie, fetching
   * collection metadata, pulling visible items via puppeteer-backed API, then
   * fetching hidden items via the Bandcamp JSON endpoint. Results are
   * normalized, deduplicated, and stored in state/localStorage.
   *
   * @param identityCookie - Raw identity (and optionally session) cookie string from the user.
   * @param manualSlug - Optional username slug provided by the user.
   */
  const startScrape = useCallback(async (identityCookie: string, manualSlug?: string) => {
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
          usernameSlug: manualSlug || usernameSlug 
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

      // 3. Hidden Items Scrape
      console.log('Checking for hidden items...');
      
      let hiddenToken: string | null = null;
      let moreHidden = true;
      let hiddenCount = 0;

      while (moreHidden) {
          const hiddenRes: Response = await fetch('/api/bandcamp/hidden-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              identityCookie: sessionCookie, 
              fanId,
              olderThanToken: hiddenToken,
              count: 100 
            }),
          });

          const hiddenData = await hiddenRes.json();
          if (!hiddenRes.ok || hiddenData.error) {
              console.warn('Hidden items fetch warning:', hiddenData.error);
              break; 
          }

          const items = hiddenData.items || [];
          if (items.length === 0) {
              moreHidden = false;
          } else {
              const hiddenRows = items.map((i: BandcampItem) => normalizeItem(i, true));
              allRows = [...allRows, ...hiddenRows];
              hiddenCount += items.length;
              setRows(deduplicateRows([...allRows]));
              
              moreHidden = hiddenData.moreAvailable;
              hiddenToken = hiddenData.nextOlderThanToken;
              
              // Small delay to be nice
              await new Promise(r => setTimeout(r, 500));
          }
      }

      console.log(`[Scraper] Found ${hiddenCount} hidden items`);

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

  /**
   * Clears all scraped data and resets progress back to idle, also wiping any
   * persisted rows stored in localStorage.
   */
  const reset = useCallback(() => {
    setRows([]);
    setProgress({ status: 'idle', itemsFetched: 0, pagesFetched: 0 });
    localStorage.removeItem('bc_scraper_rows');
  }, []);

  return { rows, progress, startScrape, reset };
}
