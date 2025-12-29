import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, beforeEach, describe, expect, it } from 'vitest';
import { useBandcampScraper } from './useBandcampScraper';
import { BandcampItem } from '../types/bandcamp';

const mockFetchResponse = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
});

describe('useBandcampScraper', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const store = new Map<string, string>();
    const storageMock: Storage = {
      getItem: (key) => (store.has(key) ? store.get(key)! : null),
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
      key: (index) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    };
    vi.stubGlobal('localStorage', storageMock);
  });

  it('hydrates saved rows from localStorage on mount', async () => {
    const savedRow = {
      purchaseKey: 'a:1:date',
      purchaseDate: 'date',
      itemType: 'album',
      itemId: 1,
      title: 'Saved Album',
      artist: 'Saved Artist',
      itemUrl: '/album',
      artUrl: '/art.jpg',
      isPreorder: false,
      preorderStatus: 'released',
    };
    localStorage.setItem('bc_scraper_rows', JSON.stringify([savedRow]));

    const { result } = renderHook(() => useBandcampScraper());

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(1);
      expect(result.current.progress.status).toBe('completed');
    });
  });

  it('scrapes collection and hidden items, then marks progress completed', async () => {
    const visibleItem: BandcampItem = {
      id: 1,
      type: 'album',
      item_id: 111,
      item_type: 'a',
      band_name: 'Visible Band',
      item_title: 'Visible Album',
      item_url: 'https://bandcamp.com/album/visible',
      art_id: 999,
      purchase_date: '2024-01-01',
      is_preorder: false,
    };

    const hiddenItem: BandcampItem = {
      id: 2,
      type: 'track',
      item_id: 222,
      item_type: 't',
      band_name: 'Hidden Band',
      item_title: 'Hidden Track',
      item_url: 'https://bandcamp.com/track/hidden',
      art_id: 123,
      purchased: '2024-02-01',
      is_preorder: true,
      preorder_status: 'unreleased',
    };

    const fetchMock = vi.fn()
      // collection-summary
      .mockResolvedValueOnce(mockFetchResponse({
        fanId: 'fan-123',
        usernameSlug: 'sluggy',
        cookieToUse: 'identity=abc; session=def',
        collectionCount: 2,
      }))
      // collection-items
      .mockResolvedValueOnce(mockFetchResponse({
        items: [visibleItem],
        moreAvailable: false,
        nextOlderThanToken: null,
        tracklists: {},
      }))
      // hidden-items
      .mockResolvedValueOnce(mockFetchResponse({
        items: [hiddenItem],
        moreAvailable: false,
        last_token: null,
      }));

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const { result } = renderHook(() => useBandcampScraper());

    await act(async () => {
      await result.current.startScrape('identity=abc');
    });

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(2);
      expect(result.current.progress.status).toBe('completed');
      expect(result.current.progress.itemsFetched).toBe(2);
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('resets rows and progress and clears persisted storage', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockFetchResponse({
        fanId: 'fan-123',
        usernameSlug: 'sluggy',
        cookieToUse: 'identity=abc; session=def',
        collectionCount: 1,
      }))
      .mockResolvedValueOnce(mockFetchResponse({
        items: [],
        moreAvailable: false,
        nextOlderThanToken: null,
        tracklists: {},
      }))
      .mockResolvedValueOnce(mockFetchResponse({
        items: [],
        moreAvailable: false,
        last_token: null,
      }));

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const { result } = renderHook(() => useBandcampScraper());

    await act(async () => {
      await result.current.startScrape('identity=abc');
    });

    await waitFor(() => expect(result.current.progress.status).toBe('completed'));
    expect(result.current.rows.length).toBeGreaterThanOrEqual(0);

    act(() => {
      result.current.reset();
    });

    expect(result.current.rows).toHaveLength(0);
    expect(result.current.progress.status).toBe('idle');
    expect(localStorage.getItem('bc_scraper_rows')).toBeNull();
  });
});
