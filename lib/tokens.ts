import crypto from 'crypto';
import { readStore, writeStore } from './storage';

const KEY = process.env.TOKEN_ENCRYPTION_KEY || '';

export type StoredToken = {
  accountEmail: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(KEY, 'base64').subarray(0, 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(payload: string): string {
  const data = Buffer.from(payload, 'base64');
  const iv = data.subarray(0, 16);
  const tag = data.subarray(16, 32);
  const encrypted = data.subarray(32);
  const key = Buffer.from(KEY, 'base64').subarray(0, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

async function readAll(): Promise<StoredToken[]> {
  try {
    const encrypted = await readStore<StoredToken[]>('tokens', []);
    return encrypted.map((t) => ({
      ...t,
      accessToken: decrypt(t.accessToken),
      refreshToken: decrypt(t.refreshToken),
    }));
  } catch {
    return [];
  }
}

async function writeAll(tokens: StoredToken[]) {
  const encrypted = tokens.map(t => ({
    ...t,
    accessToken: encrypt(t.accessToken),
    refreshToken: encrypt(t.refreshToken),
  }));
  await writeStore('tokens', encrypted);
}

export async function saveToken(token: StoredToken) {
  const tokens = await readAll();
  const filtered = tokens.filter(t => t.accountEmail !== token.accountEmail);
  filtered.push(token);
  await writeAll(filtered);
}

export async function getToken(accountEmail: string): Promise<StoredToken | null> {
  return (await readAll()).find(t => t.accountEmail === accountEmail) || null;
}

export async function getAllTokens(): Promise<StoredToken[]> {
  return readAll();
}
