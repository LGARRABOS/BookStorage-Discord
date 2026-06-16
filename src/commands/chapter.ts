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

export const chapterCommand: BotCommand = {
  name: 'chapter',

  async execute(interaction: ChatInputCommandInteraction, ctx: CommandContext): Promise<void> {
    const locale = ctx.config.DEFAULT_LOCALE;
    const token = await requireLinkedToken(interaction, ctx);
    if (!token) {
      return;
    }

    const workRef = interaction.options.getString('oeuvre', true).trim();
    const action = interaction.options.getString('action') ?? '+1';
    const delta = action === '-1' ? -1 : 1;

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

      const updated = await changeWorkChapter(client, resolved.work.id, delta);
      await interaction.editReply({ content: formatChapterResult(locale, updated) });
    } catch (error) {
      await replyChapterError(interaction, locale, error);
    }
  },
};

export const chapterCommandData = new SlashCommandBuilder()
  .setName('chapter')
  .setDescription('Modifier le chapitre d’une œuvre (+1 ou −1)')
  .addStringOption((option) =>
    option
      .setName('oeuvre')
      .setDescription('Choisissez dans la liste (œuvres « en cours »)')
      .setRequired(true)
      .setAutocomplete(true),
  )
  .addStringOption((option) =>
    option
      .setName('action')
      .setDescription('Par défaut : +1')
      .setRequired(false)
      .addChoices({ name: '+1 chapitre', value: '+1' }, { name: '−1 chapitre', value: '-1' }),
  );
