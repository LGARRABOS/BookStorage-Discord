/**
 * Vérifie la config et l'accès SQLite avant démarrage du bot.
 * Usage : node dist/preflight.js
 */
import { loadConfig, getEncryptionKey } from './config.js';
import { LinkStorage } from './storage/links.js';

function main(): void {
  try {
    const config = loadConfig();
    const links = new LinkStorage(config.LINK_DB_PATH, getEncryptionKey(config));
    links.close();
    console.log('Preflight OK');
    console.log(`  BOOKSTORAGE_BASE_URL=${config.BOOKSTORAGE_BASE_URL}`);
    console.log(`  LINK_DB_PATH=${config.LINK_DB_PATH}`);
    console.log(`  DISCORD_CLIENT_ID=${config.DISCORD_CLIENT_ID}`);
    if (config.DISCORD_GUILD_ID) {
      console.log(`  DISCORD_GUILD_ID=${config.DISCORD_GUILD_ID}`);
    }
  } catch (error) {
    console.error('Preflight FAILED — le bot ne peut pas démarrer :');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    console.error('');
    console.error('Vérifiez /opt/bookstorage-discord/.env puis :');
    console.error('  sudo -u bookstorage node /opt/bookstorage-discord/dist/preflight.js');
    process.exit(1);
  }
}

main();
