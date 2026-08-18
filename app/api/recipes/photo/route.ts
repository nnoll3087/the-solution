import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

// Client compresses to ~1MB before sending (same pipeline as the photo frame),
// so a plain server-side upload is well within limits. The URL is attached to
// a recipe's photoUrl by the caller — no separate index needed, unlike the
// photo-frame gallery which tracks many photos per family.
export async function POST(request: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Photo storage is not configured (BLOB_READ_WRITE_TOKEN missing)' }, { status: 503 });
  }
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only images are allowed' }, { status: 400 });
  }
  try {
    const blob = await put('meal-photos/' + file.name, file, { access: 'public', addRandomSuffix: true });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Meal photo upload failed:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
