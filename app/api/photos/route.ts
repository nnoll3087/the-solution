import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { getPhotos, addPhoto, removePhoto } from '@/lib/photos';

export async function GET() {
  const photos = await getPhotos();
  return NextResponse.json({ photos });
}

// Upload one photo (multipart form, field "file"). The client compresses to
// ~1MB before sending, so a plain server-side upload is well within limits.
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
    const blob = await put('photos/' + file.name, file, { access: 'public', addRandomSuffix: true });
    const photo = {
      id: crypto.randomUUID(),
      url: blob.url,
      pathname: blob.pathname,
      filename: file.name,
      uploadedAt: new Date().toISOString(),
    };
    await addPhoto(photo);
    return NextResponse.json({ photo });
  } catch (error) {
    console.error('Photo upload failed:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const photo = await removePhoto(id);
  if (photo) {
    try {
      await del(photo.url);
    } catch (error) {
      // Index entry is already gone; a stray blob is harmless
      console.error('Blob delete failed for ' + photo.pathname + ':', error);
    }
  }
  return NextResponse.json({ ok: true });
}
