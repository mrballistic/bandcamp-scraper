import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { identityCookie, fanId, olderThanToken, count = 100 } = await request.json();

    if (!identityCookie || !fanId) {
      return NextResponse.json({ error: 'Identity cookie and fan ID are required' }, { status: 400 });
    }

    // Proxy to Bandcamp
    const response = await fetch('https://bandcamp.com/api/fancollection/1/collection_items', {
      method: 'POST',
      headers: {
        'Cookie': `identity=${identityCookie}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fan_id: fanId,
        older_than_token: olderThanToken || undefined,
        count: count,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bandcamp items error:', errorText);
      return NextResponse.json({ error: `Bandcamp API error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();

    // The response has items, more_available, and last_token
    return NextResponse.json({
      items: data.items,
      moreAvailable: data.more_available,
      nextOlderThanToken: data.last_token,
      tracklists: data.tracklists,
    });
  } catch (error) {
    console.error('Proxy items error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
