import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { identityCookie, fanId, olderThanToken, count = 100 } = await request.json();

    if (!identityCookie || !fanId) {
      return NextResponse.json({ error: 'Identity cookie and fan ID are required' }, { status: 400 });
    }

    let processedCookie = identityCookie;
    if (processedCookie.includes('%')) {
      try {
        processedCookie = decodeURIComponent(processedCookie);
      } catch { /* ignore */ }
    }

    // MANDATORY: fan_id must be a string for the modern API version
    // AND we must provide a token. If null, we use a generic "end of time" token.
    const body = {
      fan_id: String(fanId),
      older_than_token: olderThanToken || "9999999999::p::1", 
      count: Number(count),
    };

    console.log(`[Collection] Fetching for Fan ${fanId}. Body:`, JSON.stringify(body));

    const response = await fetch('https://bandcamp.com/api/fancollection/1/collection_items', {
      method: 'POST',
      headers: {
        'Cookie': `identity=${processedCookie}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://bandcamp.com',
        'Referer': 'https://bandcamp.com/',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok || data.error) {
      console.error('[Collection] Bandcamp API failure:', data);
      return NextResponse.json({ 
        error: data.error_message || `Bandcamp API error: ${response.status}`,
        raw: data
      }, { status: 200 }); // Return 200 so the UI can handle the error state gracefully
    }

    console.log(`[Collection] Success: ${data.items?.length || 0} items found.`);

    return NextResponse.json({
      items: data.items || [],
      moreAvailable: !!data.more_available,
      nextOlderThanToken: data.last_token || null,
      tracklists: data.tracklists || {},
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Proxy items error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
