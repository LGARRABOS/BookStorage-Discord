import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import { chapterCommand, chapterCommandData } from './chapter.js';
import { lienCommand, lienCommandData } from './lien.js';
import { linkCommand, linkCommandData } from './link.js';
import { plusCommand, plusCommandData } from './plus.js';
import { readingCommand, readingCommandData } from './reading.js';
import { statsCommand, statsCommandData } from './stats.js';
import { statusCommand, statusCommandData } from './status.js';
import type { BotCommand } from './types.js';

export const commandData: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  linkCommandData.toJSON(),
  readingCommandData.toJSON(),
  plusCommandData.toJSON(),
  chapterCommandData.toJSON(),
  lienCommandData.toJSON(),
  statusCommandData.toJSON(),
  statsCommandData.toJSON(),
];

export const commands: BotCommand[] = [
  linkCommand,
  readingCommand,
  plusCommand,
  chapterCommand,
  lienCommand,
  statusCommand,
  statsCommand,
];

export const commandsByName = new Map(commands.map((command) => [command.name, command]));

export const autocompleteCommandNames = new Set(['plus', 'chapter', 'lien']);
