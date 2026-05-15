import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

type DeletePayload = {
  publicId?: string;
  resourceType?: 'raw' | 'image' | 'video';
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DeletePayload;
    const publicId = body.publicId?.trim();
    const resourceType = body.resourceType || 'raw';

    if (!publicId) {
      return NextResponse.json({ error: 'publicId is required' }, { status: 400 });
    }

    const cloudName = requireEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
    const apiKey = requireEnv('CLOUDINARY_API_KEY');
    const apiSecret = requireEnv('CLOUDINARY_API_SECRET');

    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('timestamp', String(timestamp));
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (data as { error?: { message?: string } })?.error?.message || 'Cloudinary delete failed';
      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json({ ok: true, result: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

