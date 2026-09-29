import { prisma } from "../db/client";

export type ModerationAction =
  | "BAN"
  | "TEMPBAN"
  | "UNBAN"
  | "KICK"
  | "MUTE"
  | "UNMUTE"
  | "WARN"
  | "CLEAR"
  | "ROLE_ADD"
  | "ROLE_REMOVE"
  | "CODEP"
  | "PROOF_APPROVE"
  | "PROOF_REJECT";

export async function logModerationAction(opts: {
  guildId: string;
  action: ModerationAction;
  targetUserId?: string;
  moderatorId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.moderationLog.create({
    data: {
      guildId: opts.guildId,
      action: opts.action,
      targetUserId: opts.targetUserId,
      moderatorId: opts.moderatorId,
      reason: opts.reason,
      metadata: opts.metadata as any,
    },
  });
}
