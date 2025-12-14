/**
 * Video Proxy API Route
 *
 * Proxies video downloads to bypass CORS restrictions.
 * Used for downloading Kling AI generated videos.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  // Only allow specific domains for security
  const allowedDomains = [
    'cdn.klingai.com',
    'klingai.com',
  ];

  try {
    const urlObj = new URL(url);
    const isAllowed = allowedDomains.some(domain => urlObj.hostname.includes(domain));

    if (!isAllowed) {
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
    }

    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch video' }, { status: response.status });
    }

    const blob = await response.blob();
    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'video/mp4');
    headers.set('Content-Disposition', `attachment; filename="bakame-video-${Date.now()}.mp4"`);

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error('Video proxy error:', error);
    return NextResponse.json({ error: 'Failed to proxy video' }, { status: 500 });
  }
}
