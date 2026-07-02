import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const TOKEN_FILE = path.join(process.cwd(), '.tokens.json');
const KEY = process.env.TOKEN_ENCRYPTION_KEY || '';

type StoredToken = {
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

function readAll(): StoredToken[] {
  if (!fs.existsSync(TOKEN_FILE)) return [];
  try {
    const raw = fs.readFileSync(TOKEN_FILE, 'utf8');
    const encrypted = JSON.parse(raw);
    return encrypted.map((t: StoredToken) => ({
      ...t,
      accessToken: decrypt(t.accessToken),
      refreshToken: decrypt(t.refreshToken),
    }));
  } catch {
    return [];
  }
}

function writeAll(tokens: StoredToken[]) {
  const encrypted = tokens.map(t => ({
    ...t,
    accessToken: encrypt(t.accessToken),
    refreshToken: encrypt(t.refreshToken),
  }));
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(encrypted, null, 2));
}

export function saveToken(token: StoredToken) {
  const tokens = readAll();
  const filtered = tokens.filter(t => t.accountEmail !== token.accountEmail);
  filtered.push(token);
  writeAll(filtered);
}

export function getToken(accountEmail: string): StoredToken | null {
  return readAll().find(t => t.accountEmail === accountEmail) || null;
}

export function getAllTokens(): StoredToken[] {
  return readAll();
}
