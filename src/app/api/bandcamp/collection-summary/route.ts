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
    
    // Log for debugging
    console.log(`Summary response for ${data.username}:`, {
      fan_id: data.fan_id,
      collection_count: data.collection_count,
      has_collection_data: !!data.collection_data
    });

    return NextResponse.json({
      fanId: data.fan_id,
      username: data.username,
      name: data.name,
      collectionCount: data.collection_count,
      raw: data // Include raw for debugging hidden fields
    });
  } catch (error) {
    console.error('Proxy summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
