import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { BotCommand } from "./types";
import { BRAND } from "../embeds";
import { getGuildConfig } from "../../db/guildConfig";

function buildHelpEmbed(prefix: string) {
  return new EmbedBuilder()
    .setColor(BRAND.primary)
    .setTitle("CABZ Assistant — Commands")
    .setDescription(
      [
        "**Creator Code Proof**",
        `\`${prefix}codep <user_id> <duration|perm>\` · \`/codep\` · \`#codep <user_id> <duration|perm>\` — grant the verification role (staff only)`,
        "",
        "**Moderation** (staff only)",
        `\`${prefix}ban <user> [duration] [reason]\` · \`/ban\``,
        `\`${prefix}kick <user> [reason]\` · \`/kick\``,
        `\`${prefix}mute <user> <duration> [reason]\` · \`/mute\``,
        `\`${prefix}unmute <user>\` · \`/unmute\``,
        `\`${prefix}warn <user> <reason>\` · \`/warn\``,
        `\`${prefix}warnings <user>\` · \`/warnings\``,
        `\`${prefix}clear <count>\` · \`/clear\``,
        `\`${prefix}role <user> <role> <add|remove>\` · \`/role\``,
        "",
        "**Other**",
        `\`${prefix}help\` · \`/help\``,
      ].join("\n")
    )
    .setFooter({ text: "CABZ Assistant" });
}

export const helpCommand: BotCommand = {
  name: "help",
  requiresStaff: false,
  data: new SlashCommandBuilder().setName("help").setDescription("List CABZ Assistant commands"),

  async runSlash(interaction) {
    const prefix = interaction.guild ? (await getGuildConfig(interaction.guild.id)).prefix : "!";
    await interaction.reply({ embeds: [buildHelpEmbed(prefix)] });
  },

  async runPrefix(message) {
    const prefix = message.guild ? (await getGuildConfig(message.guild.id)).prefix : "!";
    await message.reply({ embeds: [buildHelpEmbed(prefix)] });
  },
};
