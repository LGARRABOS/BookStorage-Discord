import { REST, Routes } from 'discord.js';
import { loadConfig } from '../src/config.js';
import { commandData } from '../src/commands/index.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

  if (config.DISCORD_GUILD_ID) {
    console.log(
      `Registering ${commandData.length} guild command(s) to guild ${config.DISCORD_GUILD_ID}…`,
    );
    await rest.put(
      Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.DISCORD_GUILD_ID),
      {
        body: commandData,
      },
    );
  } else {
    console.log(`Registering ${commandData.length} global command(s)…`);
    await rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID), { body: commandData });
  }

  console.log('Slash commands registered successfully.');
}

main().catch((error) => {
  console.error('Failed to register commands:', error);
  process.exit(1);
});
