import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "./types";
import { resolveMember, extractUserId } from "../resolve";
import { assignRole } from "../../services/moderationService";
import { errorEmbed, successEmbed } from "../embeds";

export const roleCommand: BotCommand = {
  name: "role",
  requiresStaff: true,
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Add or remove a role from a member")
    .addUserOption((o) => o.setName("user").setDescription("Target user").setRequired(true))
    .addRoleOption((o) => o.setName("role").setDescription("Role to toggle").setRequired(true))
    .addStringOption((o) =>
      o
        .setName("action")
        .setDescription("add or remove")
        .setRequired(true)
        .addChoices({ name: "add", value: "add" }, { name: "remove", value: "remove" })
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles) as SlashCommandBuilder,

  async runSlash(interaction) {
    if (!interaction.guild) return;
    const user = interaction.options.getUser("user", true);
    const role = interaction.options.getRole("role", true);
    const action = interaction.options.getString("action", true) as "add" | "remove";
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ embeds: [errorEmbed("That user is not in the server.")], ephemeral: true });
      return;
    }
    try {
      await assignRole({ member, roleId: role.id, moderatorId: interaction.user.id, add: action === "add" });
      await interaction.reply({
        embeds: [successEmbed(`✅ ${action === "add" ? "Added" : "Removed"} <@&${role.id}> ${action === "add" ? "to" : "from"} <@${user.id}>`)],
      });
    } catch (err: any) {
      await interaction.reply({ embeds: [errorEmbed(err.message ?? "Failed to update role.")], ephemeral: true });
    }
  },

  async runPrefix(message, args) {
    if (!message.guild) return;
    const targetId = args[0] ? extractUserId(args[0]) : null;
    const roleIdRaw = args[1]?.replace(/^<@&(\d+)>$/, "$1");
    const action = (args[2] ?? "add").toLowerCase();
    if (!targetId || !roleIdRaw || !["add", "remove"].includes(action)) {
      await message.reply({ embeds: [errorEmbed("Usage: `!role <user> <role> <add|remove>`")] });
      return;
    }
    const member = await resolveMember(message.guild, args[0]);
    if (!member) {
      await message.reply({ embeds: [errorEmbed("That user is not in the server.")] });
      return;
    }
    try {
      await assignRole({ member, roleId: roleIdRaw, moderatorId: message.author.id, add: action === "add" });
      await message.reply({
        embeds: [successEmbed(`✅ ${action === "add" ? "Added" : "Removed"} <@&${roleIdRaw}> ${action === "add" ? "to" : "from"} <@${targetId}>`)],
      });
    } catch (err: any) {
      await message.reply({ embeds: [errorEmbed(err.message ?? "Failed to update role.")] });
    }
  },
};
