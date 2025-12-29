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

    const response = await fetch('https://bandcamp.com/api/fancollection/1/hidden_items', {
      method: 'POST',
      headers: {
        'Cookie': `identity=${processedCookie}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://bandcamp.com',
        'Referer': 'https://bandcamp.com/',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        fan_id: String(fanId),
        older_than_token: olderThanToken || "",
        count: count,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.warn(`[Hidden] Bandcamp returned error: ${data.error_message || 'N/A'}`);
      return NextResponse.json({ 
        error: data.error_message || `Bandcamp API error: ${response.status}`,
        raw: data
      }, { status: response.status === 200 ? 400 : response.status });
    }

    return NextResponse.json({
      items: data.items || [],
      moreAvailable: !!data.more_available,
      nextOlderThanToken: data.last_token || null,
      tracklists: data.tracklists || {},
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Proxy hidden items error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
