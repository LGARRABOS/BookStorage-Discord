import { SlashCommandBuilder, type ChatInputCommandInteraction, ChannelType } from 'discord.js';
import { BookStorageClient, BookStorageApiError } from '../api/bookstorage.js';
import { mapApiError, t } from '../i18n.js';
import type { BotCommand, CommandContext } from './types.js';

export const linkCommand: BotCommand = {
  name: 'link',

  async execute(interaction: ChatInputCommandInteraction, ctx: CommandContext): Promise<void> {
    const locale = ctx.config.DEFAULT_LOCALE;

    if (interaction.channel?.type !== ChannelType.DM) {
      await interaction.reply({
        content: t(locale, 'link_dm_only'),
        ephemeral: true,
      });
      return;
    }

    const token = interaction.options.getString('token', true).trim();
    const client = new BookStorageClient(ctx.config.BOOKSTORAGE_BASE_URL, token);

    try {
      await client.getStats();
    } catch (error) {
      const message =
        error instanceof BookStorageApiError
          ? mapApiError(locale, error.code)
          : t(locale, 'link_invalid_token');
      await interaction.reply({ content: message, ephemeral: true });
      return;
    }

    ctx.links.saveLink(interaction.user.id, token, ctx.config.BOOKSTORAGE_BASE_URL);
    await interaction.reply({ content: t(locale, 'link_success') });
  },
};

export const linkCommandData = new SlashCommandBuilder()
  .setName('link')
  .setDescription('Link your BookStorage account with an API token (DM only)')
  .addStringOption((option) =>
    option
      .setName('token')
      .setDescription('API token from BookStorage (Profile → API tokens)')
      .setRequired(true),
  );
