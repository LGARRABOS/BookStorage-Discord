import type { ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';
import {
  BookStorageClient,
  BookStorageApiError,
  resolveWorkByTitle,
  type Work,
} from '../api/bookstorage.js';
import { mapApiError, t } from '../i18n.js';
import type { Config } from '../config.js';

export const WORK_INC_PREFIX = 'bs:inc:';

export type ResolveWorkResult =
  | { ok: true; work: Work }
  | { ok: false; reason: 'not_found'; title: string };

export async function resolveWorkOption(
  client: BookStorageClient,
  raw: string,
): Promise<ResolveWorkResult> {
  const trimmed = raw.trim();
  const id = Number.parseInt(trimmed, 10);
  if (id > 0 && String(id) === trimmed) {
    try {
      const response = await client.getWork(id);
      return { ok: true, work: response.data };
    } catch {
      return { ok: false, reason: 'not_found', title: trimmed };
    }
  }

  const byTitle = await resolveWorkByTitle(client, trimmed);
  if (byTitle.ok) {
    return byTitle;
  }
  if (byTitle.reason === 'not_found') {
    return byTitle;
  }

  return { ok: false, reason: 'not_found', title: trimmed };
}

export async function changeWorkChapter(
  client: BookStorageClient,
  workId: number,
  delta: 1 | -1,
): Promise<Work> {
  if (delta === 1) {
    await client.increment(workId);
  } else {
    await client.decrement(workId);
  }
  const updated = await client.getWork(workId);
  return updated.data;
}

export function formatChapterResult(locale: Config['DEFAULT_LOCALE'], work: Work): string {
  return t(locale, 'chapter_result', { title: work.title, chapter: work.chapter });
}

export async function replyChapterError(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  locale: Config['DEFAULT_LOCALE'],
  error: unknown,
): Promise<void> {
  const message =
    error instanceof BookStorageApiError
      ? mapApiError(locale, error.code)
      : t(locale, 'unknown_error');

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content: message, embeds: [], components: [] });
  } else {
    await interaction.reply({ content: message, ephemeral: true });
  }
}

export function truncateChoiceLabel(title: string, chapter: number, maxLen = 100): string {
  const suffix = ` (ch. ${chapter})`;
  const maxTitle = Math.max(1, maxLen - suffix.length);
  const shortTitle = title.length > maxTitle ? `${title.slice(0, maxTitle - 1)}…` : title;
  return `${shortTitle}${suffix}`;
}
