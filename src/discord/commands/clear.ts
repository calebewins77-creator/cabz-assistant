import { PermissionFlagsBits, SlashCommandBuilder, TextChannel } from "discord.js";
import { BotCommand } from "./types";
import { clearMessages } from "../../services/moderationService";
import { errorEmbed, successEmbed } from "../embeds";

export const clearCommand: BotCommand = {
  name: "clear",
  requiresStaff: true,
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Bulk delete recent messages in this channel")
    .addIntegerOption((o) =>
      o.setName("count").setDescription("Number of messages (1-100)").setRequired(true).setMinValue(1).setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages) as SlashCommandBuilder,

  async runSlash(interaction) {
    if (!interaction.channel || !(interaction.channel instanceof TextChannel)) return;
    const count = interaction.options.getInteger("count", true);
    try {
      const deleted = await clearMessages(interaction.channel, count, interaction.user.id);
      await interaction.reply({ embeds: [successEmbed(`✅ Deleted ${deleted} message(s).`)], ephemeral: true });
    } catch (err: any) {
      await interaction.reply({ embeds: [errorEmbed(err.message ?? "Failed to delete messages.")], ephemeral: true });
    }
  },

  async runPrefix(message, args) {
    if (!(message.channel instanceof TextChannel)) return;
    const count = Number(args[0]);
    if (!Number.isFinite(count) || count < 1) {
      await message.reply({ embeds: [errorEmbed("Usage: `!clear <count 1-100>`")] });
      return;
    }
    try {
      const deleted = await clearMessages(message.channel, count + 1, message.author.id);
      await message.channel.send({ embeds: [successEmbed(`✅ Deleted ${deleted - 1} message(s).`)] });
    } catch (err: any) {
      await message.reply({ embeds: [errorEmbed(err.message ?? "Failed to delete messages.")] });
    }
  },
};
