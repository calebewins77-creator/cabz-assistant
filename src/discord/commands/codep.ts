import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Message } from "discord.js";
import { BotCommand } from "./types";
import { extractUserId } from "../resolve";
import { runCodep, ModerationError } from "../../services/moderationService";
import { codepSuccessEmbed, errorEmbed } from "../embeds";

export const codepCommand: BotCommand = {
  name: "codep",
  requiresStaff: true,
  data: new SlashCommandBuilder()
    .setName("codep")
    .setDescription("Grant the creator-code verification role for a set duration")
    .addUserOption((o) => o.setName("user").setDescription("User to grant the role to").setRequired(true))
    .addStringOption((o) =>
      o.setName("duration").setDescription("e.g. 24h, 7d, 30d, or perm").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles) as SlashCommandBuilder,

  async runSlash(interaction, client) {
    if (!interaction.guild) return;
    const user = interaction.options.getUser("user", true);
    const duration = interaction.options.getString("duration", true);
    try {
      const result = await runCodep({
        client,
        guildId: interaction.guild.id,
        targetId: user.id,
        moderatorId: interaction.user.id,
        durationInput: duration,
      });
      await interaction.reply({
        embeds: [
          codepSuccessEmbed({
            userId: user.id,
            roleId: result.roleId,
            moderatorId: interaction.user.id,
            durationLabel: result.durationLabel,
          }),
        ],
      });
    } catch (err: any) {
      await interaction.reply({ embeds: [errorEmbed(err.message ?? "Failed to run #codep.")], ephemeral: true });
    }
  },

  async runPrefix(message, args, client) {
    await executeCodep(message, args, client);
  },
};

/** Shared handler used by both `!codep` and the special always-on `#codep` trigger. */
export async function executeCodep(message: Message, args: string[], client: any) {
  if (!message.guild) return;
  const targetId = args[0] ? extractUserId(args[0]) : null;
  const durationInput = args[1];
  if (!targetId || !durationInput) {
    await message.reply({ embeds: [errorEmbed("Usage: `#codep <user_id> <duration|perm>`")] });
    return;
  }
  try {
    const result = await runCodep({
      client,
      guildId: message.guild.id,
      targetId,
      moderatorId: message.author.id,
      durationInput,
    });
    await message.reply({
      embeds: [
        codepSuccessEmbed({
          userId: targetId,
          roleId: result.roleId,
          moderatorId: message.author.id,
          durationLabel: result.durationLabel,
        }),
      ],
    });
  } catch (err: any) {
    const msg = err instanceof ModerationError ? err.message : err.message ?? "Failed to run #codep.";
    await message.reply({ embeds: [errorEmbed(msg)] });
  }
}
