import type { ChatInputCommandInteraction } from 'discord.js';
import type { Config } from '../config.js';
import type { LinkStorage } from '../storage/links.js';

export interface CommandContext {
  config: Config;
  links: LinkStorage;
}

export interface BotCommand {
  readonly name: string;
  execute(interaction: ChatInputCommandInteraction, ctx: CommandContext): Promise<void>;
}

export async function requireLinkedToken(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Promise<string | null> {
  const token = ctx.links.getToken(interaction.user.id);
  if (!token) {
    const { t } = await import('../i18n.js');
    await interaction.reply({
      content: t(ctx.config.DEFAULT_LOCALE, 'not_linked'),
      ephemeral: true,
    });
    return null;
  }
  return token;
}
