import { readStore, writeStore } from './storage';

// Photo-frame slideshow index. The image bytes live in Vercel Blob; this store
// is only the metadata list the settings grid and slideshow read.

export type Photo = {
  id: string;
  url: string;      // public Blob URL
  pathname: string; // Blob pathname, kept for debugging/cleanup
  filename: string; // original name from the phone
  uploadedAt: string; // ISO timestamp
};

type PhotoIndex = { photos: Photo[] };

const DEFAULT_INDEX: PhotoIndex = { photos: [] };

export async function getPhotos(): Promise<Photo[]> {
  return (await readStore('photos', DEFAULT_INDEX)).photos;
}

export async function addPhoto(photo: Photo): Promise<void> {
  const photos = await getPhotos();
  photos.push(photo);
  await writeStore('photos', { photos });
}

// Returns the removed photo so the caller can delete its blob too
export async function removePhoto(id: string): Promise<Photo | null> {
  const photos = await getPhotos();
  const found = photos.find((p) => p.id === id) ?? null;
  if (found) {
    await writeStore('photos', { photos: photos.filter((p) => p.id !== id) });
  }
  return found;
}
