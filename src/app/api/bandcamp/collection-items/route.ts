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

    // Set the Cookie header directly (easier than parsing the complex identity cookie)
    console.log('[Collection] Setting cookie header...');
    await page.setExtraHTTPHeaders({
      'Cookie': identityCookie,
    });

    console.log('[Collection] Navigating to profile page...');
    await page.goto(profileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Check if there's a "show more" button
    console.log('[Collection] Looking for "show more" button...');
    
    try {
      const showMoreButton = await page.waitForSelector('button.show-more', { timeout: 5000 });
      
      if (showMoreButton) {
        console.log('[Collection] Clicking "show more" button...');
        await showMoreButton.click();
        
        // Wait for the page to load more items
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('[Collection] Waiting for network to settle...');
        await page.waitForNetworkIdle({ timeout: 15000 });
        console.log('[Collection] All items should now be loaded');
      }
    } catch {
      console.log('[Collection] No "show more" button found or already showing all items');
    }

    // Extract items directly from the DOM instead of data-blob
    console.log('[Collection] Extracting items from DOM...');
    
    const items = await page.evaluate(() => {
      const itemElements = document.querySelectorAll('.collection-item-container');
      console.log(`Found ${itemElements.length} item elements in DOM`);
      
      return Array.from(itemElements).map((el) => {
        const titleEl = el.querySelector('.collection-item-title');
        const artistEl = el.querySelector('.collection-item-artist');
        const artEl = el.querySelector('.collection-item-art img, .collection-item-art');
        const linkEl = el.querySelector('a[href]');
        
        // Extract art ID from image src or background-image
        let artId = '';
        if (artEl) {
          const imgSrc = artEl.getAttribute('src') || (artEl as HTMLElement).style.backgroundImage;
          const match = imgSrc?.match(/\/a(\d+)_/);
          if (match) artId = match[1];
        }
        
        return {
          item_id: el.getAttribute('data-itemid') || '',
          item_title: titleEl?.textContent?.trim() || '',
          band_name: artistEl?.textContent?.trim() || '',
          item_url: linkEl?.getAttribute('href') || '',
          item_art_id: artId,
          art_id: artId,
          item_art_url: artId ? `https://f4.bcbits.com/img/a${artId}_10.jpg` : '',
          purchased: el.getAttribute('data-purchased') || '',
          item_type: el.getAttribute('data-itemtype') || 'a',
        };
      });
    });

    console.log(`[Collection] Extracted ${items.length} items from DOM`);

    return NextResponse.json({
      items: items,
      moreAvailable: false,
      nextOlderThanToken: null,
      tracklists: {},
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
