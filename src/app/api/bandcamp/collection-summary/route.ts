import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { identityCookie } = await request.json();

    if (!identityCookie) {
      return NextResponse.json({ error: 'Identity cookie is required' }, { status: 400 });
    }

    let processedCookie = identityCookie;
    // Decode if it looks like it was copied from a URL-encoded source
    if (processedCookie.includes('%09') || processedCookie.includes('%7B')) {
      try {
        processedCookie = decodeURIComponent(processedCookie);
      } catch { /* ignore */ }
    }

    console.log('[Summary] Attempting to find fan profile via primary page fetch...');

    // Strategy 1: Fetch the main page and look for the identity/fan ID
    // This is often more reliable than the API for establishing a session
    const homeRes = await fetch('https://bandcamp.com/', {
      headers: {
        'Cookie': `identity=${processedCookie}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      redirect: 'follow'
    });

    const html = await homeRes.text();
    
    // Attempt to extract the "fan_id" or "blob" from the page
    // Look for data-blob or similar identity markers
    let fanId: string | null = null;
    let username = 'Member';
    
    // 1. Try to find the fan_id in the blob
    const blobMatch = html.match(/data-blob="([^"]+)"/);
    if (blobMatch) {
      try {
        const blob = JSON.parse(blobMatch[1].replace(/&quot;/g, '"'));
        if (blob.fan_data && blob.fan_data.fan_id) {
          fanId = String(blob.fan_data.fan_id);
          username = blob.fan_data.name || blob.fan_data.username || username;
          console.log(`[Summary] Found Fan ID in blob: ${fanId}`);
        }
      } catch { /* ignore */ }
    }

    // 2. Fallback: Parse from cookie if page fetch didn't yield an ID
    if (!fanId) {
      try {
        const parts = processedCookie.split('\t');
        if (parts.length >= 3) {
          const jsonMetadata = JSON.parse(parts[2]);
          if (jsonMetadata.id) {
            fanId = String(jsonMetadata.id);
            console.log(`[Summary] Fell back to Cookie Fan ID: ${fanId}`);
          }
        }
      } catch { /* ignore */ }
    }

    // 3. Last effort: Try the API one more time with refined headers
    let collectionCount = 0;
    const apiRes = await fetch('https://bandcamp.com/api/fan/2/collection_summary', {
      headers: {
        'Cookie': `identity=${processedCookie}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://bandcamp.com/',
        'Accept': 'application/json',
      },
    });

    if (apiRes.ok) {
      const apiData = await apiRes.json();
      collectionCount = apiData.collection_count || 0;
      if (!fanId) fanId = String(apiData.fan_id);
      if (username === 'Member') username = apiData.name || apiData.username || username;
    }

    console.log(`[Summary] Final Resolution: ${username} (${fanId}) - ${collectionCount} items`);

    return NextResponse.json({
      fanId: fanId,
      username: username,
      name: username,
      collectionCount: collectionCount,
      raw: { fanId, username, collectionCount }
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Proxy summary error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
