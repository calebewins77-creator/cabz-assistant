import { BotCommand } from "./types";
import { banCommand } from "./ban";
import { kickCommand } from "./kick";
import { muteCommand, unmuteCommand } from "./mute";
import { warnCommand, warningsCommand } from "./warn";
import { clearCommand } from "./clear";
import { roleCommand } from "./role";
import { codepCommand } from "./codep";
import { helpCommand } from "./help";

export const commands: BotCommand[] = [
  banCommand,
  kickCommand,
  muteCommand,
  unmuteCommand,
  warnCommand,
  warningsCommand,
  clearCommand,
  roleCommand,
  codepCommand,
  helpCommand,
];

export const commandsByName = new Map(commands.map((c) => [c.name, c]));
export const slashCommandData = commands.map((c) => c.data.toJSON());
