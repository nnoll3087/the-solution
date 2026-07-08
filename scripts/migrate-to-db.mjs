// One-shot: copies the six root JSON files into the Postgres kv_store table.
// Values are copied verbatim (tokens stay encrypted). Safe to re-run; it upserts.
//
// Usage: node --env-file=.env.local scripts/migrate-to-db.mjs

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const FILES = {
  config: '.config.json',
  tokens: '.tokens.json',
  snapshots: '.snapshots.json',
  queue: '.queue.json',
  'queue-prefs': '.queue-prefs.json',
  theme: '.theme.json',
  'event-tags': '.event-tags.json',
};

if (!process.env.POSTGRES_URL) {
  console.error('POSTGRES_URL is not set. Run with: node --env-file=.env.local scripts/migrate-to-db.mjs');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.POSTGRES_URL, max: 1 });

await pool.query(`CREATE TABLE IF NOT EXISTS kv_store (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
)`);

for (const [key, file] of Object.entries(FILES)) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) {
    console.log(`skip   ${key} (${file} not found)`);
    continue;
  }
  const raw = fs.readFileSync(p, 'utf8');
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    console.log(`skip   ${key} (${file} is not valid JSON)`);
    continue;
  }
  await pool.query(
    `INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value)]
  );
  console.log(`copied ${key} <- ${file}`);
}

await pool.end();
console.log('Done.');
