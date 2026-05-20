import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function isTrustedWeeklyReportUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('cloudinary.com');
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const targetUrl = request.nextUrl.searchParams.get('url')?.trim() || '';

    if (!targetUrl) {
      return NextResponse.json({ error: 'A file URL is required.' }, { status: 400 });
    }

    if (!isTrustedWeeklyReportUrl(targetUrl)) {
      return NextResponse.json({ error: 'Invalid file URL.' }, { status: 400 });
    }

    const response = await fetch(targetUrl, { method: 'GET' });
    if (!response.ok) {
      return NextResponse.json({ error: 'Unable to load the PDF file.' }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/pdf';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType.includes('pdf') ? 'application/pdf' : contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}