import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import { chapterCommand, chapterCommandData } from './chapter.js';
import { linkCommand, linkCommandData } from './link.js';
import { readingCommand, readingCommandData } from './reading.js';
import { statsCommand, statsCommandData } from './stats.js';
import type { BotCommand } from './types.js';

export const commandData: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  linkCommandData.toJSON(),
  readingCommandData.toJSON(),
  statsCommandData.toJSON(),
  chapterCommandData.toJSON(),
];

export const commands: BotCommand[] = [linkCommand, readingCommand, statsCommand, chapterCommand];

export const commandsByName = new Map(commands.map((command) => [command.name, command]));
