import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

// Backend switch: Postgres when POSTGRES_URL is set (Vercel), JSON files otherwise (local dev).
// Values are whole documents — each key maps 1:1 to one of the legacy root JSON files.

export type StoreKey = 'config' | 'tokens' | 'snapshots' | 'queue' | 'queue-prefs' | 'theme' | 'event-tags' | 'usage';

const FILES: Record<StoreKey, string> = {
  config: '.config.json',
  tokens: '.tokens.json',
  snapshots: '.snapshots.json',
  queue: '.queue.json',
  'queue-prefs': '.queue-prefs.json',
  theme: '.theme.json',
  'event-tags': '.event-tags.json',
  usage: '.usage.json',
};

function filePath(key: StoreKey) {
  return path.join(process.cwd(), FILES[key]);
}

// Pool cached on globalThis so Next dev hot-reload doesn't leak connections
const globalForPg = globalThis as unknown as { pgPool?: Pool; pgReady?: Promise<void> };

function getPool(): Pool {
  if (!globalForPg.pgPool) {
    globalForPg.pgPool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      max: 3,
    });
  }
  return globalForPg.pgPool;
}

function ensureTable(): Promise<void> {
  if (!globalForPg.pgReady) {
    globalForPg.pgReady = getPool()
      .query(
        `CREATE TABLE IF NOT EXISTS kv_store (
           key        text PRIMARY KEY,
           value      jsonb NOT NULL,
           updated_at timestamptz NOT NULL DEFAULT now()
         )`
      )
      .then(() => undefined);
  }
  return globalForPg.pgReady;
}

function useDb(): boolean {
  return !!process.env.POSTGRES_URL;
}

export async function readStore<T>(key: StoreKey, fallback: T): Promise<T> {
  if (useDb()) {
    await ensureTable();
    const res = await getPool().query('SELECT value FROM kv_store WHERE key = $1', [key]);
    if (res.rows.length === 0) return fallback;
    return res.rows[0].value as T;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath(key), 'utf8'));
  } catch {
    return fallback;
  }
}

export async function writeStore<T>(key: StoreKey, value: T): Promise<void> {
  if (useDb()) {
    await ensureTable();
    await getPool().query(
      `INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, JSON.stringify(value)]
    );
    return;
  }
  fs.writeFileSync(filePath(key), JSON.stringify(value, null, 2));
}

export async function deleteStore(key: StoreKey): Promise<void> {
  if (useDb()) {
    await ensureTable();
    await getPool().query('DELETE FROM kv_store WHERE key = $1', [key]);
    return;
  }
  const p = filePath(key);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
