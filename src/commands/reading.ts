import { EmbedBuilder, SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { BookStorageClient, BookStorageApiError } from '../api/bookstorage.js';
import { mapApiError, t } from '../i18n.js';
import type { BotCommand, CommandContext } from './types.js';
import { requireLinkedToken } from './types.js';

export const readingCommand: BotCommand = {
  name: 'reading',

  async execute(interaction: ChatInputCommandInteraction, ctx: CommandContext): Promise<void> {
    const locale = ctx.config.DEFAULT_LOCALE;
    const token = await requireLinkedToken(interaction, ctx);
    if (!token) {
      return;
    }

    await interaction.deferReply();

    const client = new BookStorageClient(ctx.config.BOOKSTORAGE_BASE_URL, token);

    try {
      const response = await client.listWorks({
        status: 'reading',
        sort: 'recent',
        limit: 15,
      });

      if (response.data.length === 0) {
        await interaction.editReply({ content: t(locale, 'reading_empty') });
        return;
      }

      const lines = response.data.map((work) => `• **${work.title}** — ch. ${work.chapter}`);
      if (response.meta.has_next) {
        lines.push(`_${t(locale, 'reading_more')}_`);
      }

      const embed = new EmbedBuilder()
        .setTitle(t(locale, 'reading_title'))
        .setDescription(lines.join('\n'))
        .setFooter({ text: `${response.meta.total} œuvre(s)` });

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

export const readingCommandData = new SlashCommandBuilder()
  .setName('reading')
  .setDescription('List works you are currently reading');
