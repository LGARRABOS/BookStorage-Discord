import { EmbedBuilder, SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { BookStorageClient, BookStorageApiError, resolveWorkByTitle } from '../api/bookstorage.js';
import { mapApiError, t } from '../i18n.js';
import type { BotCommand, CommandContext } from './types.js';
import { requireLinkedToken } from './types.js';

export const chapterCommand: BotCommand = {
  name: 'chapter',

  async execute(interaction: ChatInputCommandInteraction, ctx: CommandContext): Promise<void> {
    const locale = ctx.config.DEFAULT_LOCALE;
    const token = await requireLinkedToken(interaction, ctx);
    if (!token) {
      return;
    }

    const title = interaction.options.getString('titre', true).trim();
    const action = interaction.options.getString('action', true);

    await interaction.deferReply();

    const client = new BookStorageClient(ctx.config.BOOKSTORAGE_BASE_URL, token);

    try {
      const resolved = await resolveWorkByTitle(client, title);

      if (!resolved.ok) {
        if (resolved.reason === 'not_found') {
          await interaction.editReply({
            content: t(locale, 'chapter_not_found', { title: resolved.title }),
          });
          return;
        }

        const lines = resolved.works.map((work) => `• **${work.title}** — ch. ${work.chapter}`);
        const embed = new EmbedBuilder()
          .setTitle(t(locale, 'chapter_ambiguous_title', { title: resolved.title }))
          .setDescription([...lines, '', t(locale, 'chapter_ambiguous_hint')].join('\n'));

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const work = resolved.work;
      if (action === '+1') {
        await client.increment(work.id);
      } else {
        await client.decrement(work.id);
      }

      const updated = await client.getWork(work.id);
      await interaction.editReply({
        content: t(locale, 'chapter_result', {
          title: updated.data.title,
          chapter: updated.data.chapter,
        }),
      });
    } catch (error) {
      const message =
        error instanceof BookStorageApiError
          ? mapApiError(locale, error.code)
          : t(locale, 'unknown_error');
      await interaction.editReply({ content: message });
    }
  },
};

export const chapterCommandData = new SlashCommandBuilder()
  .setName('chapter')
  .setDescription('Increment or decrement a work chapter by title')
  .addStringOption((option) =>
    option.setName('titre').setDescription('Work title (partial match)').setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('action')
      .setDescription('Chapter change')
      .setRequired(true)
      .addChoices({ name: '+1', value: '+1' }, { name: '-1', value: '-1' }),
  );
