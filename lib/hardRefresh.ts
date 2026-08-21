// Clears any Cache Storage entries, then navigates with a cache-busting query
// param so the reload always hits the network instead of a cached response.
// Shared by the manual Force Refresh button and the daily kiosk auto-refresh.
export async function hardRefresh(path: string = '/') {
  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {
      // Cache Storage isn't available everywhere; the cache-busting reload below still works.
    }
  }
  const url = new URL(path, window.location.origin);
  url.searchParams.set('_', Date.now().toString());
  window.location.href = url.toString();
}
