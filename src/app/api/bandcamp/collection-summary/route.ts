import { NextResponse } from 'next/server';

/**
 * Validates the supplied Bandcamp identity/session cookie, reconstructs a
 * well-formed header, and pulls lightweight fan context (fan ID, username,
 * collection count). Acts as an authentication gate before deeper scraping.
 *
 * Request body:
 * - `identityCookie`: Raw cookie string pasted by the user.
 */
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

    // 5. FETCH CONTEXT (Verify we're truly logged in and get username slug)
    let username = 'Member';
    let usernameSlug = '';
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
        console.log('[Summary] Blob keys:', Object.keys(blob));
        
        // Try different locations for user data (order matters - identities is on home page)
        if (blob.identities?.fan) {
          const fan = blob.identities.fan;
          fanId = fanId || String(fan.id);
          username = fan.name || fan.username || username;
          usernameSlug = fan.username || '';
          console.log('[Summary] Found identities.fan:', fan.username);
        } else if (blob.fan_data) {
          fanId = fanId || String(blob.fan_data.fan_id);
          username = blob.fan_data.name || blob.fan_data.username || username;
          usernameSlug = blob.fan_data.username || '';
          collectionCount = blob.fan_data.collection_count || 0;
          console.log('[Summary] Found fan_data:', blob.fan_data.username);
        } else if (blob.appData?.identities?.fan) {
          const identity = blob.appData.identities.fan;
          fanId = fanId || String(identity.id);
          username = identity.name || identity.username || username;
          usernameSlug = identity.username || '';
          console.log('[Summary] Found identity in appData:', identity.username);
        } else if (blob.pageContext?.pageFan) {
          const pageFan = blob.pageContext.pageFan;
          fanId = fanId || String(pageFan.fan_id || pageFan.id || pageFan.pageFanId);
          username = pageFan.name || pageFan.username || pageFan.pageFanUsername || username;
          usernameSlug = pageFan.username || pageFan.pageFanUsername || '';
          collectionCount = pageFan.collection_count || pageFan.item_count || 0;
        }
        
        console.log(`[Summary] Extracted: ${username} (ID: ${fanId}, Slug: "${usernameSlug}", Count: ${collectionCount})`);
      } catch (e) { 
        console.error('[Summary] Error parsing blob:', e);
      }
    }

    if (!fanId) {
       console.error('[Summary] CRITICAL: Could not resolve Fan ID after all strategies');
       return NextResponse.json({ error: 'Could not resolve Fan ID. Check your cookie format.' }, { status: 400 });
    }

    return NextResponse.json({
      fanId: fanId,
      username: username,
      usernameSlug: usernameSlug,
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
