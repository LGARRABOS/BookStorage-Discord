import { EmbedBuilder, SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { BookStorageClient, BookStorageApiError } from '../api/bookstorage.js';
import { formatProbeStatusLabel, linkStatusEmoji } from '../link-status.js';
import { mapApiError, t } from '../i18n.js';
import type { BotCommand, CommandContext } from './types.js';
import { requireLinkedToken } from './types.js';
import { resolveWorkOption } from './work-chapter.js';

export const lienCommand: BotCommand = {
  name: 'lien',

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

      const work = resolved.work;
      if (!work.link?.trim()) {
        await interaction.editReply({
          content: t(locale, 'lien_no_link', { title: work.title }),
        });
        return;
      }

      const statusLine =
        work.link_status && work.link_status !== 'unknown'
          ? formatProbeStatusLabel(locale, work.link_status)
          : t(locale, 'lien_status_unknown');

      const embed = new EmbedBuilder()
        .setTitle(`${linkStatusEmoji(work.link_status)} ${work.title}`)
        .setDescription(`**${t(locale, 'lien_field_link')}**\n${work.link}`)
        .addFields(
          { name: t(locale, 'lien_field_chapter'), value: String(work.chapter), inline: true },
          { name: t(locale, 'lien_field_status'), value: statusLine, inline: true },
        )
        .setURL(work.link);

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

export const lienCommandData = new SlashCommandBuilder()
  .setName('lien')
  .setDescription('Lien de lecture et statut d’une œuvre')
  .addStringOption((option) =>
    option
      .setName('oeuvre')
      .setDescription('Choisissez dans la liste')
      .setRequired(true)
      .setAutocomplete(true),
  );
