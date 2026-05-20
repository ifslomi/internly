import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';

export const runtime = 'nodejs';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function sanitizeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function uploadBuffer(buffer: Buffer, publicId: string, folder: string) {
  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'raw',
        use_filename: true,
        unique_filename: false,
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Cloudinary upload failed'));
          return;
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );

    Readable.from(buffer).pipe(stream);
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const fileEntry = formData.get('file');
    const userId = String(formData.get('userId') || '').trim();
    const weekNumber = String(formData.get('weekNumber') || '').trim();

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: 'A PDF file is required.' }, { status: 400 });
    }

    if (fileEntry.size === 0) {
      return NextResponse.json({ error: 'Uploaded file is empty.' }, { status: 400 });
    }

    const mimeType = fileEntry.type;
    const fileName = fileEntry.name || 'weekly-report.pdf';
    if (mimeType !== 'application/pdf' || !fileName.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Weekly report uploads must be PDF files only.' }, { status: 400 });
    }

    if (fileEntry.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Weekly report PDF must be 20MB or smaller.' }, { status: 400 });
    }

    const cloudName = requireEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
    const apiKey = requireEnv('CLOUDINARY_API_KEY');
    const apiSecret = requireEnv('CLOUDINARY_API_SECRET');

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    const buffer = Buffer.from(await fileEntry.arrayBuffer());
    const folder = 'internly/weekly-reports';
    const publicId = [sanitizeSegment(userId || 'user'), `week-${sanitizeSegment(weekNumber || '0')}`, `${Date.now()}`]
      .filter(Boolean)
      .join('/');

    const uploaded = await uploadBuffer(buffer, publicId, folder);

    return NextResponse.json({
      ok: true,
      fileUrl: uploaded.secure_url,
      fileName,
      filePublicId: uploaded.public_id,
      fileResourceType: 'raw' as const,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}