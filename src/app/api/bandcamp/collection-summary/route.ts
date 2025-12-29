import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { identityCookie } = await request.json();

    if (!identityCookie) {
      return NextResponse.json({ error: 'Cookie is required' }, { status: 400 });
    }

    const rawInput = identityCookie.trim();
    console.log('[Summary] Decoding raw input of length:', rawInput.length);

    // 1. PRE-DECODE: Ensure we are working with real characters (Tabs, curly braces, etc)
    let decodedInput = rawInput;
    if (decodedInput.includes('%')) {
      try {
        decodedInput = decodeURIComponent(decodedInput);
      } catch { /* use original */ }
    }

    let idVal = '';
    let sessVal = '';

    // 2. SEMANTIC SPLIT: Identify which part is which
    const parts = decodedInput.split(';');
    parts.forEach((p: string) => {
      const item = p.trim();
      if (!item) return;

      if (item.toLowerCase().startsWith('identity=')) {
        idVal = item.substring(9);
      } else if (item.toLowerCase().startsWith('session=')) {
        sessVal = item.substring(8);
      } else if (item.startsWith('{')) {
        // It's a raw JSON session object
        sessVal = item;
      } else if (item.includes('\t') || item.includes('{"id"')) {
        // It's the multi-column identity token
        idVal = item;
      } else if (item.length > 50) {
        // Fallback for long strings
        idVal = item;
      }
    });

    if (!idVal) {
       console.error('[Summary] Error: Could not isolate identity component');
       return NextResponse.json({ error: 'Could not isolate identity part of cookie' }, { status: 400 });
    }

    // 3. IDENTIFY FAN ID (The most critical part)
    let fanId: string | null = null;
    
    // Strategy A: Parse from identity metadata
    try {
      const idParts = idVal.split('\t');
      // Token metadata is usually in the 3rd column
      const metaStr = idParts.find(p => p.startsWith('{') && p.includes('"id"'));
      if (metaStr) {
        const meta = JSON.parse(metaStr);
        if (meta.id) {
          fanId = String(meta.id);
          console.log(`[Summary] Found Fan ID in metadata: ${fanId}`);
        }
      }
    } catch { /* ignore */ }

    // Strategy B: Regex search for the ID number
    if (!fanId) {
      const idMatch = idVal.match(/"id":\s*(\d+)/);
      if (idMatch) {
        fanId = idMatch[1];
        console.log(`[Summary] Found Fan ID via regex: ${fanId}`);
      }
    }

    // 4. RECONSTRUCT PROFESSIONAL HEADER
    // Bandcamp needs: identity=[token]; session=[url-encoded-json]
    let finalHeader = `identity=${idVal}`;
    if (sessVal) {
      const encodedSess = sessVal.startsWith('{') ? encodeURIComponent(sessVal) : sessVal;
      finalHeader += `; session=${encodedSess}`;
    }

    console.log('[Summary] Reconstructed header. Fetching profile context...');

    // 5. FETCH CONTEXT (Verify we're truly logged in)
    let username = 'Member';
    let collectionCount = 0;

    const homeRes = await fetch('https://bandcamp.com/', {
      headers: {
        'Cookie': finalHeader,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    const homeHtml = await homeRes.text();
    const blobMatch = homeHtml.match(/data-blob="([^"]+)"/);
    if (blobMatch) {
      try {
        const blob = JSON.parse(blobMatch[1].replace(/&quot;/g, '"'));
        if (blob.fan_data) {
          fanId = fanId || String(blob.fan_data.fan_id);
          username = blob.fan_data.name || blob.fan_data.username || username;
          collectionCount = blob.fan_data.collection_count || 0;
          console.log(`[Summary] Verified Session for: ${username} (ID: ${fanId})`);
        }
      } catch { /* ignore */ }
    }

    if (!fanId) {
       console.error('[Summary] CRITICAL: Could not resolve Fan ID after all strategies');
       return NextResponse.json({ error: 'Could not resolve Fan ID. Check your cookie format.' }, { status: 400 });
    }

    return NextResponse.json({
      fanId: fanId,
      username: username,
      name: username,
      collectionCount: collectionCount,
      cookieToUse: finalHeader
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Proxy summary error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
