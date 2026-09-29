import { Client, Message } from "discord.js";
import { getGuildConfig } from "../../db/guildConfig";
import { handleProofSubmission } from "../../services/proofService";
import { commandsByName } from "../commands";
import { executeCodep } from "../commands/codep";
import { isStaff } from "../permissions";
import { errorEmbed } from "../embeds";
import { logger } from "../../logger";

const CODEP_TRIGGER = "#codep";

export function registerMessageCreate(client: Client) {
  client.on("messageCreate", async (message: Message) => {
    try {
      await onMessage(client, message);
    } catch (err) {
      logger.error({ err, messageId: message.id }, "Unhandled error in messageCreate");
    }
  });
}

async function onMessage(client: Client, message: Message) {
  if (message.author.bot || !message.guild) return;

  const cfg = await getGuildConfig(message.guild.id);

  if (cfg.proofChannelId && message.channel.id === cfg.proofChannelId) {
    await handleProofSubmission(message);
    return;
  }

  const content = message.content;

  if (content.startsWith(CODEP_TRIGGER)) {
    const member = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!member || !(await isStaff(member))) {
      await message.reply({ embeds: [errorEmbed("You do not have permission to use `#codep`.")] });
      return;
    }
    const args = content.slice(CODEP_TRIGGER.length).trim().split(/\s+/).filter(Boolean);
    await executeCodep(message, args, client);
    return;
  }

  const prefix = cfg.prefix || "!";
  if (!content.startsWith(prefix)) return;

  const args = content.slice(prefix.length).trim().split(/\s+/).filter(Boolean);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  const command = commandsByName.get(commandName);
  if (!command) return;

  if (command.requiresStaff) {
    const member = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!member || !(await isStaff(member))) {
      await message.reply({ embeds: [errorEmbed(`You do not have permission to use \`${prefix}${commandName}\`.`)] });
      return;
    }
  }

  await command.runPrefix(message, args, client);
}
