import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "./types";
import { resolveMember, extractUserId } from "../resolve";
import { kickMember } from "../../services/moderationService";
import { errorEmbed, successEmbed } from "../embeds";

export const kickCommand: BotCommand = {
  name: "kick",
  requiresStaff: true,
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .addUserOption((o) => o.setName("user").setDescription("User to kick").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers) as SlashCommandBuilder,

  async runSlash(interaction) {
    if (!interaction.guild) return;
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? undefined;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ embeds: [errorEmbed("That user is not in the server.")], ephemeral: true });
      return;
    }
    try {
      await kickMember({ member, moderatorId: interaction.user.id, reason });
      await interaction.reply({ embeds: [successEmbed(`✅ Kicked <@${user.id}>${reason ? ` — ${reason}` : ""}`)] });
    } catch (err: any) {
      await interaction.reply({ embeds: [errorEmbed(err.message ?? "Failed to kick user.")], ephemeral: true });
    }
  },

  async runPrefix(message, args) {
    if (!message.guild) return;
    const targetId = args[0] ? extractUserId(args[0]) : null;
    if (!targetId) {
      await message.reply({ embeds: [errorEmbed("Usage: `!kick <user> [reason]`")] });
      return;
    }
    const member = await resolveMember(message.guild, args[0]);
    if (!member) {
      await message.reply({ embeds: [errorEmbed("That user is not in the server.")] });
      return;
    }
    const reason = args.slice(1).join(" ") || undefined;
    try {
      await kickMember({ member, moderatorId: message.author.id, reason });
      await message.reply({ embeds: [successEmbed(`✅ Kicked <@${targetId}>${reason ? ` — ${reason}` : ""}`)] });
    } catch (err: any) {
      await message.reply({ embeds: [errorEmbed(err.message ?? "Failed to kick user.")] });
    }
  },
};
