import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { BookStorageClient } from '../api/bookstorage.js';
import { t } from '../i18n.js';
import type { BotCommand, CommandContext } from './types.js';
import { requireLinkedToken } from './types.js';
import {
  changeWorkChapter,
  formatChapterResult,
  replyChapterError,
  resolveWorkOption,
} from './work-chapter.js';

export const plusCommand: BotCommand = {
  name: 'plus',

  async execute(interaction: ChatInputCommandInteraction, ctx: CommandContext): Promise<void> {
    const locale = ctx.config.DEFAULT_LOCALE;
    const token = await requireLinkedToken(interaction, ctx);
    if (!token) {
      return;
    }

    const workRef = interaction.options.getString('oeuvre', true).trim();

    await interaction.deferReply({ ephemeral: true });

    const client = new BookStorageClient(ctx.config.BOOKSTORAGE_BASE_URL, token);

    try {
      const resolved = await resolveWorkOption(client, workRef);
      if (!resolved.ok) {
        await interaction.editReply({
          content: t(locale, 'chapter_not_found', { title: workRef }),
        });
        return;
      }

      const updated = await changeWorkChapter(client, resolved.work.id, 1);
      await interaction.editReply({ content: formatChapterResult(locale, updated) });
    } catch (error) {
      await replyChapterError(interaction, locale, error);
    }
  },
};

export const plusCommandData = new SlashCommandBuilder()
  .setName('plus')
  .setDescription('Avancer d’un chapitre (+1) sur une œuvre en cours')
  .addStringOption((option) =>
    option
      .setName('oeuvre')
      .setDescription('Choisissez dans la liste (œuvres « en cours »)')
      .setRequired(true)
      .setAutocomplete(true),
  );
