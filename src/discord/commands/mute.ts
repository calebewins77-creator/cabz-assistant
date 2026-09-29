import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "./types";
import { resolveMember, extractUserId } from "../resolve";
import { parseDuration, formatDurationLabel } from "../durations";
import { muteMember, unmuteMember } from "../../services/moderationService";
import { errorEmbed, successEmbed } from "../embeds";

export const muteCommand: BotCommand = {
  name: "mute",
  requiresStaff: true,
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Timeout a member for a set duration (max 28 days)")
    .addUserOption((o) => o.setName("user").setDescription("User to mute").setRequired(true))
    .addStringOption((o) => o.setName("duration").setDescription("e.g. 10m, 1h, 1d").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) as SlashCommandBuilder,

  async runSlash(interaction) {
    if (!interaction.guild) return;
    const user = interaction.options.getUser("user", true);
    const durationInput = interaction.options.getString("duration", true);
    const reason = interaction.options.getString("reason") ?? undefined;
    const parsed = parseDuration(durationInput);
    if (!parsed || parsed.permanent) {
      await interaction.reply({ embeds: [errorEmbed("Provide a temporary duration, e.g. `10m`, `1h`, `1d`.")], ephemeral: true });
      return;
    }
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ embeds: [errorEmbed("That user is not in the server.")], ephemeral: true });
      return;
    }
    try {
      const applied = await muteMember({ member, moderatorId: interaction.user.id, reason, durationMs: parsed.ms! });
      await interaction.reply({
        embeds: [successEmbed(`✅ Muted <@${user.id}> for ${formatDurationLabel(applied)}${reason ? ` — ${reason}` : ""}`)],
      });
    } catch (err: any) {
      await interaction.reply({ embeds: [errorEmbed(err.message ?? "Failed to mute user.")], ephemeral: true });
    }
  },

  async runPrefix(message, args) {
    if (!message.guild) return;
    const targetId = args[0] ? extractUserId(args[0]) : null;
    if (!targetId || !args[1]) {
      await message.reply({ embeds: [errorEmbed("Usage: `!mute <user> <duration> [reason]`")] });
      return;
    }
    const parsed = parseDuration(args[1]);
    if (!parsed || parsed.permanent) {
      await message.reply({ embeds: [errorEmbed("Provide a temporary duration, e.g. `10m`, `1h`, `1d`.")] });
      return;
    }
    const member = await resolveMember(message.guild, args[0]);
    if (!member) {
      await message.reply({ embeds: [errorEmbed("That user is not in the server.")] });
      return;
    }
    const reason = args.slice(2).join(" ") || undefined;
    try {
      const applied = await muteMember({ member, moderatorId: message.author.id, reason, durationMs: parsed.ms! });
      await message.reply({
        embeds: [successEmbed(`✅ Muted <@${targetId}> for ${formatDurationLabel(applied)}${reason ? ` — ${reason}` : ""}`)],
      });
    } catch (err: any) {
      await message.reply({ embeds: [errorEmbed(err.message ?? "Failed to mute user.")] });
    }
  },
};

export const unmuteCommand: BotCommand = {
  name: "unmute",
  requiresStaff: true,
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Remove an active timeout from a member")
    .addUserOption((o) => o.setName("user").setDescription("User to unmute").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) as SlashCommandBuilder,

  async runSlash(interaction) {
    if (!interaction.guild) return;
    const user = interaction.options.getUser("user", true);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ embeds: [errorEmbed("That user is not in the server.")], ephemeral: true });
      return;
    }
    try {
      await unmuteMember({ member, moderatorId: interaction.user.id });
      await interaction.reply({ embeds: [successEmbed(`✅ Unmuted <@${user.id}>`)] });
    } catch (err: any) {
      await interaction.reply({ embeds: [errorEmbed(err.message ?? "Failed to unmute user.")], ephemeral: true });
    }
  },

  async runPrefix(message, args) {
    if (!message.guild) return;
    const targetId = args[0] ? extractUserId(args[0]) : null;
    if (!targetId) {
      await message.reply({ embeds: [errorEmbed("Usage: `!unmute <user>`")] });
      return;
    }
    const member = await resolveMember(message.guild, args[0]);
    if (!member) {
      await message.reply({ embeds: [errorEmbed("That user is not in the server.")] });
      return;
    }
    try {
      await unmuteMember({ member, moderatorId: message.author.id });
      await message.reply({ embeds: [successEmbed(`✅ Unmuted <@${targetId}>`)] });
    } catch (err: any) {
      await message.reply({ embeds: [errorEmbed(err.message ?? "Failed to unmute user.")] });
    }
  },
};
