import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "./types";
import { resolveMember, extractUserId } from "../resolve";
import { parseDuration } from "../durations";
import { banMember } from "../../services/moderationService";
import { errorEmbed, successEmbed } from "../embeds";

export const banCommand: BotCommand = {
  name: "ban",
  requiresStaff: true,
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member, optionally for a limited duration")
    .addUserOption((o) => o.setName("user").setDescription("User to ban").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(false))
    .addStringOption((o) =>
      o.setName("duration").setDescription("e.g. 7d, 24h, or leave blank for permanent").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers) as SlashCommandBuilder,

  async runSlash(interaction) {
    if (!interaction.guild) return;
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? undefined;
    const durationInput = interaction.options.getString("duration");
    const durationMs = await resolveDuration(durationInput, interaction);
    if (durationInput && durationMs === undefined) return;

    try {
      await banMember({
        guild: interaction.guild,
        targetId: user.id,
        moderatorId: interaction.user.id,
        reason,
        durationMs: durationMs ?? null,
      });
      await interaction.reply({
        embeds: [successEmbed(`✅ Banned <@${user.id}>${reason ? ` — ${reason}` : ""}`)],
      });
    } catch (err: any) {
      await interaction.reply({ embeds: [errorEmbed(err.message ?? "Failed to ban user.")], ephemeral: true });
    }
  },

  async runPrefix(message, args) {
    if (!message.guild) return;
    const targetId = args[0] ? extractUserId(args[0]) : null;
    if (!targetId) {
      await message.reply({ embeds: [errorEmbed("Usage: `!ban <user> [duration] [reason]`")] });
      return;
    }

    let rest = args.slice(1);
    let durationMs: number | null = null;
    if (rest[0]) {
      const parsed = parseDuration(rest[0]);
      if (parsed) {
        durationMs = parsed.permanent ? null : parsed.ms!;
        rest = rest.slice(1);
      }
    }
    const reason = rest.join(" ") || undefined;

    try {
      await banMember({ guild: message.guild, targetId, moderatorId: message.author.id, reason, durationMs });
      await message.reply({
        embeds: [successEmbed(`✅ Banned <@${targetId}>${reason ? ` — ${reason}` : ""}`)],
      });
    } catch (err: any) {
      await message.reply({ embeds: [errorEmbed(err.message ?? "Failed to ban user.")] });
    }
  },
};

async function resolveDuration(input: string | null, interaction: any): Promise<number | null | undefined> {
  if (!input) return null;
  const parsed = parseDuration(input);
  if (!parsed) {
    await interaction.reply({ embeds: [errorEmbed("Invalid duration format.")], ephemeral: true });
    return undefined;
  }
  return parsed.permanent ? null : parsed.ms;
}
