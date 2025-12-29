import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: Request) {
  let browser;
  
  try {
    const { identityCookie, fanId, usernameSlug } = await request.json();

    if (!identityCookie) {
      return NextResponse.json({ error: 'Cookie required' }, { status: 400 });
    }

    const profileUrl = usernameSlug 
      ? `https://bandcamp.com/${usernameSlug}` 
      : fanId 
        ? `https://bandcamp.com/fan/${fanId}`
        : null;

    if (!profileUrl) {
      return NextResponse.json({ error: 'Need either username or fan ID' }, { status: 400 });
    }

    console.log(`[Collection] Launching browser for: ${profileUrl}`);

    // Launch headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Parse and set cookies
    const cookieParts = identityCookie.split(';').map((c: string) => c.trim());
    const cookies = [];
    
    for (const part of cookieParts) {
      if (!part.includes('=')) continue;
      
      const [name, ...valueParts] = part.split('=');
      const value = valueParts.join('=').trim();
      
      if (name && value) {
        cookies.push({
          name: name.trim(),
          value: value,
          domain: '.bandcamp.com',
          path: '/',
          httpOnly: false,
          secure: true,
          sameSite: 'Lax' as const,
        });
      }
    }

    console.log(`[Collection] Setting ${cookies.length} cookies...`);
    await page.setCookie(...cookies);

    console.log('[Collection] Navigating to profile page...');
    await page.goto(profileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Check if there's a "show all" or "view all" button
    console.log('[Collection] Looking for "show all" button...');
    
    try {
      // Common selectors for the "show all" button on Bandcamp
      const showAllButton = await page.waitForSelector(
        'button.show-all, a.show-all, .collection-grid .show-all, button:has-text("show"), button:has-text("all")',
        { timeout: 5000 }
      );
      
      if (showAllButton) {
        console.log('[Collection] Clicking "show all" button...');
        await showAllButton.click();
        
        // Wait for the page to load more items
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.waitForNetworkIdle({ timeout: 10000 });
      }
    } catch {
      console.log('[Collection] No "show all" button found or already showing all items');
    }

    // Extract the data blob from the page
    console.log('[Collection] Extracting data blob...');
    
    const dataBlob = await page.evaluate(() => {
      const script = document.querySelector('div[data-blob]');
      if (script) {
        return script.getAttribute('data-blob');
      }
      return null;
    });

    if (!dataBlob) {
      throw new Error('Could not find data-blob in page');
    }

    const blob = JSON.parse(dataBlob.replace(/&quot;/g, '"'));
    console.log('[Collection] Blob keys:', Object.keys(blob));

    let items: Record<string, unknown>[] = [];
    const tracklists: Record<string, unknown> = blob.tracklists || {};

    // First try item_cache.collection (most reliable after "show all")
    if (blob.item_cache?.collection) {
      const rawItems = Object.values(blob.item_cache.collection);
      
      items = rawItems.map((rawItem) => {
        const item = rawItem as Record<string, unknown>;
        const artId = item.item_art_id || item.band_image_id;
        
        return {
          ...item,
          art_id: artId,
          item_art_url: artId ? `https://f4.bcbits.com/img/a${artId}_10.jpg` : '',
        };
      });
      
      console.log(`[Collection] Found ${items.length} items in item_cache.collection`);
    }

    // Fallback: Try collection_data.redownload_urls
    if (items.length === 0 && blob.collection_data?.redownload_urls) {
      const redownloadData = blob.collection_data.redownload_urls;
      
      items = Object.entries(redownloadData).map(([saleItemId, itemData]) => {
        const item = itemData as Record<string, unknown>;
        const artId = item.art_id || item.item_art_id;
        const artUrl = artId ? `https://f4.bcbits.com/img/a${artId}_10.jpg` : '';
        
        return {
          sale_item_id: item.sale_item_id || saleItemId,
          sale_item_type: item.sale_item_type || 'a',
          item_title: item.title || item.item_title || '',
          item_url: item.url || item.item_url || '',
          band_name: item.band_name || '',
          art_id: artId,
          item_art_url: artUrl,
          purchased: item.purchased || '',
          ...item
        };
      });
      
      console.log(`[Collection] Found ${items.length} items in redownload_urls`);
    }

    console.log(`[Collection] Final count: ${items.length} items`);

    return NextResponse.json({
      items: items,
      moreAvailable: false,
      nextOlderThanToken: null,
      tracklists: tracklists,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Puppeteer scrape error:', msg);
    return NextResponse.json({ error: 'Internal server error: ' + msg }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
