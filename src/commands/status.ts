import { EmbedBuilder, SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import {
  BookStorageClient,
  BookStorageApiError,
  fetchBookStorageHealth,
} from '../api/bookstorage.js';
import { formatProbeStatusLabel } from '../link-status.js';
import { mapApiError, t } from '../i18n.js';
import type { BotCommand, CommandContext } from './types.js';
import { requireLinkedToken } from './types.js';

function formatUptime(locale: 'fr' | 'en', seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (locale === 'fr') {
    if (hours > 0) {
      return `${hours} h ${minutes} min`;
    }
    return `${minutes} min`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export const statusCommand: BotCommand = {
  name: 'status',

  async execute(interaction: ChatInputCommandInteraction, ctx: CommandContext): Promise<void> {
    const locale = ctx.config.DEFAULT_LOCALE;
    const token = await requireLinkedToken(interaction, ctx);
    if (!token) {
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const baseUrl = ctx.config.BOOKSTORAGE_BASE_URL;
    const client = new BookStorageClient(baseUrl, token);

    try {
      const [health, sitesResponse] = await Promise.all([
        fetchBookStorageHealth(baseUrl).catch(() => null),
        client.listReadingSites(),
      ]);

      const embeds: EmbedBuilder[] = [];

      if (health) {
        const appStatus = health.ok
          ? t(locale, 'status_app_online')
          : t(locale, 'status_app_degraded');
        const appEmbed = new EmbedBuilder()
          .setTitle(t(locale, 'status_app_title'))
          .addFields(
            { name: t(locale, 'status_field_state'), value: appStatus, inline: true },
            { name: t(locale, 'status_field_version'), value: health.version || '—', inline: true },
            {
              name: t(locale, 'status_field_uptime'),
              value: formatUptime(locale, health.uptime_sec),
              inline: true,
            },
          )
          .setURL(baseUrl);
        embeds.push(appEmbed);
      } else {
        embeds.push(
          new EmbedBuilder()
            .setTitle(t(locale, 'status_app_title'))
            .setDescription(t(locale, 'status_app_unreachable', { url: baseUrl })),
        );
      }

      const sites = sitesResponse.data;
      if (sites.length === 0) {
        embeds.push(
          new EmbedBuilder()
            .setTitle(t(locale, 'status_sites_title'))
            .setDescription(t(locale, 'status_sites_empty')),
        );
      } else {
        const lines = sites.map((site) => {
          const status = formatProbeStatusLabel(locale, site.probe_status, site.probe_http_status);
          return `**${site.name}**\n${status}\n${site.base_url}`;
        });
        embeds.push(
          new EmbedBuilder()
            .setTitle(t(locale, 'status_sites_title'))
            .setDescription(lines.join('\n\n')),
        );
      }

      await interaction.editReply({ embeds });
    } catch (error) {
      const message =
        error instanceof BookStorageApiError
          ? mapApiError(locale, error.code)
          : t(locale, 'unknown_error');
      await interaction.editReply({ content: message });
    }
  },
};

export const statusCommandData = new SlashCommandBuilder()
  .setName('status')
  .setDescription('État de BookStorage et de vos sites de lecture');
