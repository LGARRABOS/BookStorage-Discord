import 'dotenv/config';
import { z } from 'zod';

const localeSchema = z.enum(['fr', 'en']);

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_GUILD_ID: z.string().optional(),
  BOOKSTORAGE_BASE_URL: z
    .string()
    .url('BOOKSTORAGE_BASE_URL must be a valid URL')
    .transform((url) => url.replace(/\/+$/, '')),
  LINK_DB_PATH: z.string().default('./data/links.db'),
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(1, 'TOKEN_ENCRYPTION_KEY is required')
    .refine((key) => {
      try {
        return Buffer.from(key, 'base64').length === 32;
      } catch {
        return false;
      }
    }, 'TOKEN_ENCRYPTION_KEY must be 32 bytes encoded in base64'),
  DEFAULT_LOCALE: localeSchema.default('fr'),
});

export type Locale = z.infer<typeof localeSchema>;
export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return parsed.data;
}

export function getEncryptionKey(config: Config): Buffer {
  return Buffer.from(config.TOKEN_ENCRYPTION_KEY, 'base64');
}
