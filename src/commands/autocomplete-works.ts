import type { AutocompleteInteraction } from 'discord.js';
import { BookStorageClient } from '../api/bookstorage.js';
import { truncateChoiceLabel } from './work-chapter.js';
import type { CommandContext } from './types.js';

export async function handleReadingWorksAutocomplete(
  interaction: AutocompleteInteraction,
  ctx: CommandContext,
): Promise<void> {
  const token = ctx.links.getToken(interaction.user.id);
  if (!token) {
    await interaction.respond([]);
    return;
  }

  const focused = interaction.options.getFocused(true);
  const query = focused.value.trim();
  const allWorks = interaction.commandName === 'lien';

  const client = new BookStorageClient(ctx.config.BOOKSTORAGE_BASE_URL, token);
  try {
    const response = await client.listWorks({
      status: allWorks ? undefined : 'reading',
      search: query || undefined,
      sort: 'recent',
      limit: 25,
    });

    await interaction.respond(
      response.data.map((work) => ({
        name: truncateChoiceLabel(work.title, work.chapter),
        value: String(work.id),
      })),
    );
  } catch {
    await interaction.respond([]);
  }
}
