import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { identityCookie, fanId } = await request.json();

    if (!identityCookie || !fanId) {
      return NextResponse.json({ error: 'Cookie and Fan ID are required' }, { status: 400 });
    }

    console.log(`[Collection] Attempting HTML scrape for Fan ${fanId}...`);

    // Strategy: Fetch the actual collection page HTML and parse the embedded JSON
    const response = await fetch(`https://bandcamp.com/fan/${fanId}`, {
      headers: {
        'Cookie': identityCookie,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    if (!response.ok) {
      console.error(`[Collection] HTTP ${response.status} when fetching profile page`);
      return NextResponse.json({ error: `Failed to fetch profile page: ${response.status}` }, { status: 500 });
    }

    const html = await response.text();
    
    // Look for the collection data blob in the HTML
    const blobMatch = html.match(/data-blob="([^"]+)"/);
    if (!blobMatch) {
      console.error('[Collection] No data-blob found in HTML');
      return NextResponse.json({ error: 'Could not find collection data in page' }, { status: 500 });
    }

    let items: any[] = [];
    let tracklists: any = {};
    
    try {
      const blobStr = blobMatch[1].replace(/&quot;/g, '"');
      const blob = JSON.parse(blobStr);
      
      console.log('[Collection] Blob keys:', Object.keys(blob));
      
      if (blob.collection_data && blob.collection_data.redownload_urls) {
        // Parse the redownload_urls which contains the collection items
        const redownloadData = blob.collection_data.redownload_urls;
        items = Object.keys(redownloadData).map(key => {
          const item = redownloadData[key];
          // Transform to match our expected format
          return {
            sale_item_id: item.sale_item_id || key,
            sale_item_type: item.sale_item_type || 'a',
            item_title: item.title || '',
            item_url: item.url || '',
            band_name: item.band_name || '',
            item_art_url: item.art_url || item.art_id ? `https://f4.bcbits.com/img/a${item.art_id}_10.jpg` : '',
            purchased: item.purchased || '',
            ...item
          };
        });
        
        console.log(`[Collection] Successfully parsed ${items.length} items from HTML blob`);
      } else if (blob.item_cache && blob.item_cache.collection) {
        // Alternative structure
        items = Object.values(blob.item_cache.collection);
        console.log(`[Collection] Found ${items.length} items in item_cache`);
      }
      
      // Look for tracklists
      if (blob.tracklists) {
        tracklists = blob.tracklists;
      }
      
    } catch (e) {
      console.error('[Collection] Error parsing blob:', e);
      return NextResponse.json({ error: 'Failed to parse collection data' }, { status: 500 });
    }

    return NextResponse.json({
      items: items,
      moreAvailable: false, // HTML scrape gets everything at once
      nextOlderThanToken: null,
      tracklists: tracklists,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Proxy items error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
