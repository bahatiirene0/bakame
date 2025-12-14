/**
 * Image Proxy API Route
 *
 * Proxies image downloads to bypass CORS restrictions.
 * Used for downloading DALL-E generated images.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  // Only allow specific domains for security
  const allowedDomains = [
    'oaidalleapiprodscus.blob.core.windows.net', // DALL-E images
    'cdn.openai.com',
  ];

  try {
    const urlObj = new URL(url);
    const isAllowed = allowedDomains.some(domain => urlObj.hostname.includes(domain));

    if (!isAllowed) {
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
    }

    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    const blob = await response.blob();
    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'image/png');
    headers.set('Content-Disposition', `attachment; filename="bakame-image-${Date.now()}.png"`);

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}
