import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { identityCookie, fanId, olderThanToken, count = 100 } = await request.json();

    if (!identityCookie || !fanId) {
      return NextResponse.json({ error: 'Identity cookie and fan ID are required' }, { status: 400 });
    }

    const body = {
      fan_id: fanId,
      older_than_token: olderThanToken || undefined,
      count: count,
    };

    console.log('Fetching items with:', { fanId, olderThanToken, count });

    // Proxy to Bandcamp
    const response = await fetch('https://bandcamp.com/api/fancollection/1/collection_items', {
      method: 'POST',
      headers: {
        'Cookie': `identity=${identityCookie}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bandcamp items error:', errorText, 'Status:', response.status);
      return NextResponse.json({ error: `Bandcamp API error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    
    // Log for debugging
    if (!data.items || data.items.length === 0) {
      console.warn('Bandcamp returned 0 items. Full response data:', JSON.stringify(data, null, 2));
    } else {
      console.log(`Fetched ${data.items.length} items. More available: ${data.more_available}`);
    }

    // The response has items, more_available, and last_token
    return NextResponse.json({
      items: data.items || [],
      moreAvailable: !!data.more_available,
      nextOlderThanToken: data.last_token || null,
      tracklists: data.tracklists || {},
    });
  } catch (error) {
    console.error('Proxy items error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
