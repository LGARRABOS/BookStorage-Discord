import { EmbedBuilder, SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { BookStorageClient, BookStorageApiError } from '../api/bookstorage.js';
import { mapApiError, t } from '../i18n.js';
import type { BotCommand, CommandContext } from './types.js';
import { requireLinkedToken } from './types.js';

export const statsCommand: BotCommand = {
  name: 'stats',

  async execute(interaction: ChatInputCommandInteraction, ctx: CommandContext): Promise<void> {
    const locale = ctx.config.DEFAULT_LOCALE;
    const token = await requireLinkedToken(interaction, ctx);
    if (!token) {
      return;
    }

    await interaction.deferReply();

    const client = new BookStorageClient(ctx.config.BOOKSTORAGE_BASE_URL, token);

    try {
      const response = await client.getStats();
      const stats = response.data;

      const embed = new EmbedBuilder().setTitle(t(locale, 'stats_title')).addFields(
        { name: t(locale, 'stats_works'), value: String(stats.total_works), inline: true },
        { name: t(locale, 'stats_chapters'), value: String(stats.total_chapters), inline: true },
        {
          name: t(locale, 'stats_avg_rating'),
          value: stats.avg_rating > 0 ? stats.avg_rating.toFixed(2) : '—',
          inline: true,
        },
        { name: t(locale, 'stats_rated'), value: String(stats.rated_count), inline: true },
      );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const message =
        error instanceof BookStorageApiError
          ? mapApiError(locale, error.code)
          : t(locale, 'unknown_error');
      await interaction.editReply({ content: message });
    }
  },
};

export const statsCommandData = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('Show your BookStorage reading statistics');
