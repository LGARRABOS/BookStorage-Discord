import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import Database from 'better-sqlite3';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export class LinkStorage {
  private readonly db: Database.Database;
  private readonly key: Buffer;

  constructor(dbPath: string, encryptionKey: Buffer) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.key = encryptionKey;
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_links (
        discord_user_id TEXT PRIMARY KEY,
        token_ciphertext BLOB NOT NULL,
        token_nonce BLOB NOT NULL,
        linked_at TEXT NOT NULL,
        bookstorage_base_url TEXT NOT NULL
      )
    `);
  }

  private encrypt(token: string): { ciphertext: Buffer; nonce: Buffer } {
    const nonce = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, nonce);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return { ciphertext: Buffer.concat([encrypted, authTag]), nonce };
  }

  private decrypt(ciphertext: Buffer, nonce: Buffer): string {
    const authTag = ciphertext.subarray(ciphertext.length - AUTH_TAG_LENGTH);
    const data = ciphertext.subarray(0, ciphertext.length - AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, this.key, nonce);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  saveLink(discordUserId: string, token: string, bookstorageBaseUrl: string): void {
    const { ciphertext, nonce } = this.encrypt(token);
    const linkedAt = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO user_links (discord_user_id, token_ciphertext, token_nonce, linked_at, bookstorage_base_url)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(discord_user_id) DO UPDATE SET
           token_ciphertext = excluded.token_ciphertext,
           token_nonce = excluded.token_nonce,
           linked_at = excluded.linked_at,
           bookstorage_base_url = excluded.bookstorage_base_url`,
      )
      .run(discordUserId, ciphertext, nonce, linkedAt, bookstorageBaseUrl);
  }

  getToken(discordUserId: string): string | null {
    const row = this.db
      .prepare(`SELECT token_ciphertext, token_nonce FROM user_links WHERE discord_user_id = ?`)
      .get(discordUserId) as { token_ciphertext: Buffer; token_nonce: Buffer } | undefined;

    if (!row) {
      return null;
    }

    return this.decrypt(row.token_ciphertext, row.token_nonce);
  }

  hasLink(discordUserId: string): boolean {
    const row = this.db
      .prepare(`SELECT 1 FROM user_links WHERE discord_user_id = ?`)
      .get(discordUserId);
    return row !== undefined;
  }

  close(): void {
    this.db.close();
  }
}
