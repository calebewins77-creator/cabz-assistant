import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "./types";
import { resolveMember, extractUserId } from "../resolve";
import { warnMember, listWarnings } from "../../services/moderationService";
import { errorEmbed, successEmbed, BRAND } from "../embeds";
import { EmbedBuilder } from "discord.js";

export const warnCommand: BotCommand = {
  name: "warn",
  requiresStaff: true,
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Issue a warning to a member")
    .addUserOption((o) => o.setName("user").setDescription("User to warn").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) as SlashCommandBuilder,

  async runSlash(interaction) {
    if (!interaction.guild) return;
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);
    await warnMember({ guildId: interaction.guild.id, targetId: user.id, moderatorId: interaction.user.id, reason });
    await interaction.reply({ embeds: [successEmbed(`⚠️ Warned <@${user.id}> — ${reason}`)] });
  },

  async runPrefix(message, args) {
    if (!message.guild) return;
    const targetId = args[0] ? extractUserId(args[0]) : null;
    const reason = args.slice(1).join(" ");
    if (!targetId || !reason) {
      await message.reply({ embeds: [errorEmbed("Usage: `!warn <user> <reason>`")] });
      return;
    }
    await warnMember({ guildId: message.guild.id, targetId, moderatorId: message.author.id, reason });
    await message.reply({ embeds: [successEmbed(`⚠️ Warned <@${targetId}> — ${reason}`)] });
  },
};

export const warningsCommand: BotCommand = {
  name: "warnings",
  requiresStaff: true,
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("List warnings for a member")
    .addUserOption((o) => o.setName("user").setDescription("User to check").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) as SlashCommandBuilder,

  async runSlash(interaction) {
    if (!interaction.guild) return;
    const user = interaction.options.getUser("user", true);
    const warnings = await listWarnings(interaction.guild.id, user.id);
    await interaction.reply({ embeds: [buildWarningsEmbed(user.id, warnings)] });
  },

  async runPrefix(message, args) {
    if (!message.guild) return;
    const targetId = args[0] ? extractUserId(args[0]) : null;
    if (!targetId) {
      await message.reply({ embeds: [errorEmbed("Usage: `!warnings <user>`")] });
      return;
    }
    const warnings = await listWarnings(message.guild.id, targetId);
    await message.reply({ embeds: [buildWarningsEmbed(targetId, warnings)] });
  },
};

function buildWarningsEmbed(userId: string, warnings: { reason: string | null; moderatorId: string; createdAt: Date }[]) {
  const embed = new EmbedBuilder()
    .setColor(BRAND.warning)
    .setTitle(`Warnings for <@${userId}>`)
    .setFooter({ text: `${warnings.length} total warning(s)` });

  if (warnings.length === 0) {
    embed.setDescription("No warnings on record.");
  } else {
    embed.setDescription(
      warnings
        .slice(0, 15)
        .map(
          (w, i) =>
            `**${i + 1}.** ${w.reason ?? "*No reason given*"}\n└ by <@${w.moderatorId}> — <t:${Math.floor(w.createdAt.getTime() / 1000)}:R>`
        )
        .join("\n\n")
    );
  }
  return embed;
}
