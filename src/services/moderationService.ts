import { Client, Guild, GuildMember, TextChannel } from "discord.js";
import { prisma } from "../db/client";
import { logModerationAction } from "./moderationLog";
import { scheduleTempBanExpiry } from "./tempBanScheduler";
import { grantRole } from "./roleGrantService";
import { getGuildConfig } from "../db/guildConfig";
import { parseDuration } from "../discord/durations";

export class ModerationError extends Error {}

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

export async function banMember(opts: {
  guild: Guild;
  targetId: string;
  moderatorId: string;
  reason?: string;
  durationMs?: number | null;
}) {
  await opts.guild.members.ban(opts.targetId, { reason: opts.reason, deleteMessageSeconds: 0 });

  if (opts.durationMs) {
    const record = await prisma.tempBan.create({
      data: {
        guildId: opts.guild.id,
        userId: opts.targetId,
        expiresAt: new Date(Date.now() + opts.durationMs),
      },
    });
    scheduleTempBanExpiry(opts.guild.client, record.id);
  }

  await logModerationAction({
    guildId: opts.guild.id,
    action: opts.durationMs ? "TEMPBAN" : "BAN",
    targetUserId: opts.targetId,
    moderatorId: opts.moderatorId,
    reason: opts.reason,
    metadata: opts.durationMs ? { durationMs: opts.durationMs } : undefined,
  });
}

export async function unbanMember(opts: { guild: Guild; targetId: string; moderatorId: string; reason?: string }) {
  await opts.guild.members.unban(opts.targetId, opts.reason);
  await prisma.tempBan.updateMany({
    where: { guildId: opts.guild.id, userId: opts.targetId, liftedAt: null },
    data: { liftedAt: new Date() },
  });
  await logModerationAction({
    guildId: opts.guild.id,
    action: "UNBAN",
    targetUserId: opts.targetId,
    moderatorId: opts.moderatorId,
    reason: opts.reason,
  });
}

export async function kickMember(opts: { member: GuildMember; moderatorId: string; reason?: string }) {
  await opts.member.kick(opts.reason);
  await logModerationAction({
    guildId: opts.member.guild.id,
    action: "KICK",
    targetUserId: opts.member.id,
    moderatorId: opts.moderatorId,
    reason: opts.reason,
  });
}

export async function muteMember(opts: {
  member: GuildMember;
  moderatorId: string;
  reason?: string;
  durationMs: number;
}) {
  const clamped = Math.min(opts.durationMs, MAX_TIMEOUT_MS);
  await opts.member.timeout(clamped, opts.reason);
  await logModerationAction({
    guildId: opts.member.guild.id,
    action: "MUTE",
    targetUserId: opts.member.id,
    moderatorId: opts.moderatorId,
    reason: opts.reason,
    metadata: { durationMs: clamped },
  });
  return clamped;
}

export async function unmuteMember(opts: { member: GuildMember; moderatorId: string; reason?: string }) {
  await opts.member.timeout(null, opts.reason);
  await logModerationAction({
    guildId: opts.member.guild.id,
    action: "UNMUTE",
    targetUserId: opts.member.id,
    moderatorId: opts.moderatorId,
    reason: opts.reason,
  });
}

export async function warnMember(opts: {
  guildId: string;
  targetId: string;
  moderatorId: string;
  reason: string;
}) {
  await logModerationAction({
    guildId: opts.guildId,
    action: "WARN",
    targetUserId: opts.targetId,
    moderatorId: opts.moderatorId,
    reason: opts.reason,
  });
}

export async function listWarnings(guildId: string, targetId: string) {
  return prisma.moderationLog.findMany({
    where: { guildId, targetUserId: targetId, action: "WARN" },
    orderBy: { createdAt: "desc" },
  });
}

export async function clearMessages(channel: TextChannel, count: number, moderatorId: string) {
  const deleted = await channel.bulkDelete(Math.min(Math.max(count, 1), 100), true);
  await logModerationAction({
    guildId: channel.guild.id,
    action: "CLEAR",
    moderatorId,
    metadata: { channelId: channel.id, count: deleted.size },
  });
  return deleted.size;
}

export async function assignRole(opts: {
  member: GuildMember;
  roleId: string;
  moderatorId: string;
  add: boolean;
  reason?: string;
}) {
  if (opts.add) {
    await opts.member.roles.add(opts.roleId, opts.reason);
  } else {
    await opts.member.roles.remove(opts.roleId, opts.reason);
  }
  await logModerationAction({
    guildId: opts.member.guild.id,
    action: opts.add ? "ROLE_ADD" : "ROLE_REMOVE",
    targetUserId: opts.member.id,
    moderatorId: opts.moderatorId,
    metadata: { roleId: opts.roleId },
  });
}

export interface CodepResult {
  durationLabel: string;
  roleId: string;
}

/** Shared business logic behind both `#codep` and `/codep`. */
export async function runCodep(opts: {
  client: Client;
  guildId: string;
  targetId: string;
  moderatorId: string;
  durationInput: string;
}): Promise<CodepResult> {
  const parsed = parseDuration(opts.durationInput);
  if (!parsed) {
    throw new ModerationError(
      "Invalid duration. Use formats like `24h`, `7d`, `30m`, `2w`, or `perm` for permanent."
    );
  }

  const cfg = await getGuildConfig(opts.guildId);
  if (!cfg.verifiedRoleId) {
    throw new ModerationError("No verified role is configured for this server.");
  }

  await grantRole({
    client: opts.client,
    guildId: opts.guildId,
    userId: opts.targetId,
    roleId: cfg.verifiedRoleId,
    grantedBy: opts.moderatorId,
    reason: "codep",
    expiresAt: parsed.permanent ? null : new Date(Date.now() + parsed.ms!),
  });

  await logModerationAction({
    guildId: opts.guildId,
    action: "CODEP",
    targetUserId: opts.targetId,
    moderatorId: opts.moderatorId,
    metadata: { durationLabel: parsed.label },
  });

  return { durationLabel: parsed.label, roleId: cfg.verifiedRoleId };
}
