'use client';

import { useEffect, useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';

type Photo = {
  id: string;
  url: string;
  filename: string;
  uploadedAt: string;
};

type Progress = { current: number; total: number; name: string } | null;

export function PhotoManager() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<Progress>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch('/api/photos')
      .then((r) => r.json())
      .then((data) => setPhotos(data.photos || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = [...fileList];
    setError(null);
    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ current: i + 1, total: files.length, name: file.name });
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 2000,
          useWebWorker: true,
        });
        const form = new FormData();
        form.append('file', new File([compressed], file.name, { type: compressed.type }));
        const res = await fetch('/api/photos', { method: 'POST', body: form });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Upload failed');
        }
      } catch (e) {
        failed++;
        setError(e instanceof Error ? e.message : 'Upload failed');
      }
    }
    setProgress(null);
    if (failed > 0) setError(failed + ' of ' + files.length + ' photos failed to upload');
    if (inputRef.current) inputRef.current.value = '';
    load();
  }

  async function deletePhoto(id: string) {
    setConfirmId(null);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    await fetch('/api/photos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
    load();
  }

  return (
    <div>
      <p className="text-text-muted text-sm mb-4">
        Photos show as a slideshow after the calendar sits idle for 15 minutes. They&apos;re compressed on your phone before uploading.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={progress !== null}
          className="px-4 py-2.5 min-h-[44px] rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition disabled:opacity-50"
        >
          {progress ? 'Uploading...' : '+ Add photos'}
        </button>
        {progress && (
          <span className="text-sm text-text-muted">
            {progress.current} of {progress.total}: {progress.name}
          </span>
        )}
        {!progress && photos.length > 0 && (
          <span className="text-sm text-text-subtle">{photos.length} photo{photos.length === 1 ? '' : 's'}</span>
        )}
      </div>

      {progress && (
        <div className="h-1.5 rounded-full bg-bg/50 overflow-hidden mb-4">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: Math.round(((progress.current - 1) / progress.total) * 100) + '%' }}
          />
        </div>
      )}

      {error && <p className="text-sm text-danger-themed mb-3">{error}</p>}

      {!loading && photos.length === 0 && !progress && (
        <p className="text-sm text-text-subtle">No photos yet. Add some to turn the idle calendar into a photo frame.</p>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border-themed bg-bg/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.filename} loading="lazy" className="w-full h-full object-cover" />
              {confirmId === photo.id ? (
                <div className="absolute inset-0 bg-bg/80 flex flex-col items-center justify-center gap-2">
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="px-3 py-1.5 rounded-lg bg-danger-themed text-white text-xs font-semibold"
                  >
                    Delete
                  </button>
                  <button onClick={() => setConfirmId(null)} className="text-xs text-text-muted">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(photo.id)}
                  title="Delete photo"
                  className="absolute top-1 right-1 w-7 h-7 flex items-center justify-center rounded-full bg-bg/70 text-text text-xs opacity-80 hover:opacity-100 transition"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
