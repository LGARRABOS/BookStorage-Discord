import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { BookStorageClient, BookStorageApiError } from '../api/bookstorage.js';
import { mapApiError, t } from '../i18n.js';
import type { BotCommand, CommandContext } from './types.js';
import { requireLinkedToken } from './types.js';
import { truncateChoiceLabel, WORK_INC_PREFIX } from './work-chapter.js';
import { linkStatusEmoji } from '../link-status.js';

const MAX_READING_BUTTONS = 10;

export const readingCommand: BotCommand = {
  name: 'reading',

  async execute(interaction: ChatInputCommandInteraction, ctx: CommandContext): Promise<void> {
    const locale = ctx.config.DEFAULT_LOCALE;
    const token = await requireLinkedToken(interaction, ctx);
    if (!token) {
      return;
    }

    await interaction.deferReply({ ephemeral: true });

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

      const lines = response.data.map((work) => {
        const status = linkStatusEmoji(work.link_status);
        const linkPart = work.link?.trim()
          ? ` — [${t(locale, 'reading_open_link')}](${work.link})`
          : '';
        const prefix = status ? `${status} ` : '';
        return `• ${prefix}**${work.title}** — ch. ${work.chapter}${linkPart}`;
      });
      if (response.meta.has_next) {
        lines.push(`_${t(locale, 'reading_more')}_`);
      }
      lines.push('', `_${t(locale, 'reading_buttons_hint')}_`);

      const embed = new EmbedBuilder()
        .setTitle(t(locale, 'reading_title'))
        .setDescription(lines.join('\n'))
        .setFooter({ text: `${response.meta.total} œuvre(s)` });

      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      const buttonWorks = response.data.slice(0, MAX_READING_BUTTONS);

      for (let i = 0; i < buttonWorks.length; i += 5) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        for (const work of buttonWorks.slice(i, i + 5)) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`${WORK_INC_PREFIX}${work.id}`)
              .setLabel(truncateChoiceLabel(work.title, work.chapter, 80))
              .setStyle(ButtonStyle.Primary),
          );
        }
        rows.push(row);
      }

      await interaction.editReply({ embeds: [embed], components: rows });
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
  .setDescription('Vos lectures en cours (+1 en un clic)');
