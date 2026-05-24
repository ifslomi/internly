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

function sanitizeDownloadFilename(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'weekly-report.pdf';
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'weekly-report.pdf';
}

export async function GET(request: NextRequest) {
  try {
    const targetUrl = request.nextUrl.searchParams.get('url')?.trim() || '';
    const shouldDownload = request.nextUrl.searchParams.get('download') === '1';
    const requestedFilename = request.nextUrl.searchParams.get('filename') || '';
    const filename = sanitizeDownloadFilename(requestedFilename);

    if (!targetUrl) {
      return NextResponse.json({ error: 'A file URL is required.' }, { status: 400 });
    }

    if (!isTrustedWeeklyReportUrl(targetUrl)) {
      return NextResponse.json({ error: 'Invalid file URL.' }, { status: 400 });
    }

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/pdf,*/*',
      },
      cache: 'no-store',
    });
    if (!response.ok) {
      return NextResponse.json({ error: 'Unable to load the PDF file.' }, { status: response.status });
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${shouldDownload ? 'attachment' : 'inline'}; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}