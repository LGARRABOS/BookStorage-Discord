import type { ButtonInteraction } from 'discord.js';
import { BookStorageClient } from '../api/bookstorage.js';
import {
  WORK_INC_PREFIX,
  changeWorkChapter,
  formatChapterResult,
  replyChapterError,
} from './work-chapter.js';
import type { CommandContext } from './types.js';

export async function handleWorkButton(
  interaction: ButtonInteraction,
  ctx: CommandContext,
): Promise<void> {
  if (!interaction.customId.startsWith(WORK_INC_PREFIX)) {
    return;
  }

  const locale = ctx.config.DEFAULT_LOCALE;
  const token = ctx.links.getToken(interaction.user.id);
  if (!token) {
    const { t } = await import('../i18n.js');
    await interaction.reply({ content: t(locale, 'not_linked'), ephemeral: true });
    return;
  }

  const workId = Number.parseInt(interaction.customId.slice(WORK_INC_PREFIX.length), 10);
  if (workId <= 0) {
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const client = new BookStorageClient(ctx.config.BOOKSTORAGE_BASE_URL, token);

  try {
    const updated = await changeWorkChapter(client, workId, 1);
    await interaction.editReply({ content: formatChapterResult(locale, updated) });
  } catch (error) {
    await replyChapterError(interaction, locale, error);
  }
}
