import { Client, Events, GatewayIntentBits } from 'discord.js';
import { loadConfig, getEncryptionKey } from './config.js';
import { commandsByName } from './commands/index.js';
import { LinkStorage } from './storage/links.js';

async function main(): Promise<void> {
  console.log('Starting BookStorage Discord bot…');
  const config = loadConfig();
  const links = new LinkStorage(config.LINK_DB_PATH, getEncryptionKey(config));

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = commandsByName.get(interaction.commandName);
    if (!command) {
      return;
    }

    try {
      await command.execute(interaction, { config, links });
    } catch (error) {
      console.error(`Command /${interaction.commandName} failed:`, error);
      const payload = { content: 'Internal error.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    }
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`Received ${signal}, shutting down…`);
    links.close();
    client.destroy();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await client.login(config.DISCORD_TOKEN);
}

main().catch((error) => {
  console.error('Fatal error — bot stopped:');
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exit(1);
});
