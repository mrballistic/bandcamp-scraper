import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { identityCookie } = await request.json();

    if (!identityCookie) {
      return NextResponse.json({ error: 'Identity cookie is required' }, { status: 400 });
    }

    // Proxy to Bandcamp
    const response = await fetch('https://bandcamp.com/api/fan/2/collection_summary', {
      headers: {
        'Cookie': `identity=${identityCookie}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bandcamp summary error:', errorText);
      return NextResponse.json({ error: `Bandcamp API error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();

    // Data consists of a lot of things, we mainly want fan_id and username
    // Note: Bandcamp might return a 200 with no fan_id if the cookie is invalid
    if (!data.fan_id) {
       return NextResponse.json({ error: 'Invalid or expired identity cookie' }, { status: 401 });
    }

    return NextResponse.json({
      fanId: data.fan_id,
      username: data.username,
      name: data.name,
      collectionCount: data.collection_count,
    });
  } catch (error) {
    console.error('Proxy summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
