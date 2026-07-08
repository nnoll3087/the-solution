// Household password auth. Web Crypto only (no Node crypto) so it runs in both
// the proxy (edge) and route handlers.
//
// FAMILY_PASSWORD unset -> auth disabled entirely (local dev).
// Cookie value = HMAC(secret, versioned password), so changing the password
// invalidates every existing session.

export const AUTH_COOKIE = 'solution_auth';
export const AUTH_MAX_AGE = 180 * 24 * 60 * 60; // 180 days

export function authEnabled(): boolean {
  return !!process.env.FAMILY_PASSWORD;
}

export async function expectedAuthToken(): Promise<string | null> {
  const password = process.env.FAMILY_PASSWORD;
  if (!password) return null;
  const secret = process.env.AUTH_SECRET || password;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('solution-auth-v1:' + password));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
