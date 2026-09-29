import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Message,
  TextChannel,
} from "discord.js";
import { prisma } from "../db/client";
import { getGuildConfig } from "../db/guildConfig";
import { proofApprovedEmbed, proofPendingEmbed, proofRejectedEmbed } from "../discord/embeds";
import { logModerationAction } from "./moderationLog";
import { logger } from "../logger";

function describeRoleAssignError(err: any): string {
  if (err?.code === 50013) return "I lack permission to assign that role (check role hierarchy).";
  if (err?.code === 10011) {
    return "The configured verification role no longer exists in this server. Set a valid role in the dashboard's Creator Code Verification settings.";
  }
  return "Unexpected error while approving.";
}

function buildButtons(submissionId: string, disabled = false) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`proof:approve:${submissionId}`)
      .setLabel("Yes — Approve")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`proof:reject:${submissionId}`)
      .setLabel("No — Reject")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

/** Called from messageCreate when a message lands in the configured proof channel. */
export async function handleProofSubmission(message: Message) {
  if (!message.guild || message.author.bot) return;

  const imageAttachment = [...message.attachments.values()].find((a) =>
    (a.contentType ?? "").startsWith("image/")
  );
  const contentText = message.content.trim().length > 0 ? message.content.trim() : null;

  if (!imageAttachment && !contentText) return;

  const submission = await prisma.proofSubmission.create({
    data: {
      guildId: message.guild.id,
      channelId: message.channel.id,
      submitterId: message.author.id,
      originalMessageId: message.id,
      attachmentUrl: imageAttachment?.url ?? null,
      contentText,
    },
  });

  const embed = proofPendingEmbed({
    submitter: message.author,
    contentText,
    attachmentUrl: imageAttachment?.url ?? null,
  });

  const channel = message.channel as TextChannel;
  const reviewMessage = await channel.send({
    embeds: [embed],
    components: [buildButtons(submission.id)],
  });

  await prisma.proofSubmission.update({
    where: { id: submission.id },
    data: { reviewMessageId: reviewMessage.id },
  });
}

export type ProofDecisionResult =
  | { ok: true }
  | { ok: false; reason: "already_decided"; status: string }
  | { ok: false; reason: "member_left" }
  | { ok: false; reason: "role_error"; message: string }
  | { ok: false; reason: "not_found" };

async function lockForProcessing(submissionId: string, moderatorId: string) {
  const claimed = await prisma.proofSubmission.updateMany({
    where: { id: submissionId, status: "PENDING" },
    data: { status: "PROCESSING", decidedBy: moderatorId },
  });
  return claimed.count === 1;
}

async function revertToPending(submissionId: string) {
  await prisma.proofSubmission.updateMany({
    where: { id: submissionId, status: "PROCESSING" },
    data: { status: "PENDING", decidedBy: null },
  });
}

export async function approveProof(opts: {
  client: Client;
  submissionId: string;
  moderatorId: string;
}): Promise<ProofDecisionResult> {
  const submission = await prisma.proofSubmission.findUnique({ where: { id: opts.submissionId } });
  if (!submission) return { ok: false, reason: "not_found" };
  if (submission.status !== "PENDING") {
    return { ok: false, reason: "already_decided", status: submission.status };
  }

  const claimed = await lockForProcessing(opts.submissionId, opts.moderatorId);
  if (!claimed) {
    const current = await prisma.proofSubmission.findUnique({ where: { id: opts.submissionId } });
    return { ok: false, reason: "already_decided", status: current?.status ?? "UNKNOWN" };
  }

  try {
    const guild = await opts.client.guilds.fetch(submission.guildId);
    const member = await guild.members.fetch(submission.submitterId).catch(() => null);
    if (!member) {
      await revertToPending(opts.submissionId);
      return { ok: false, reason: "member_left" };
    }

    const cfg = await getGuildConfig(submission.guildId);
    if (!cfg.verifiedRoleId) {
      await revertToPending(opts.submissionId);
      return { ok: false, reason: "role_error", message: "No verified role is configured for this server." };
    }
    const roleId = cfg.verifiedRoleId;

    await member.roles.add(roleId, `Creator code proof approved by ${opts.moderatorId}`);

    await prisma.proofSubmission.update({
      where: { id: opts.submissionId },
      data: { status: "APPROVED", decidedAt: new Date() },
    });

    await deleteOriginalMessage(opts.client, submission);

    await logModerationAction({
      guildId: submission.guildId,
      action: "PROOF_APPROVE",
      targetUserId: submission.submitterId,
      moderatorId: opts.moderatorId,
      metadata: { submissionId: submission.id, roleId },
    });

    return { ok: true };
  } catch (err: any) {
    await revertToPending(opts.submissionId);
    logger.error({ err, submissionId: opts.submissionId }, "Failed to approve proof");
    return {
      ok: false,
      reason: "role_error",
      message: describeRoleAssignError(err),
    };
  }
}

export async function rejectProof(opts: {
  client: Client;
  submissionId: string;
  moderatorId: string;
}): Promise<ProofDecisionResult> {
  const submission = await prisma.proofSubmission.findUnique({ where: { id: opts.submissionId } });
  if (!submission) return { ok: false, reason: "not_found" };
  if (submission.status !== "PENDING") {
    return { ok: false, reason: "already_decided", status: submission.status };
  }

  const claimed = await lockForProcessing(opts.submissionId, opts.moderatorId);
  if (!claimed) {
    const current = await prisma.proofSubmission.findUnique({ where: { id: opts.submissionId } });
    return { ok: false, reason: "already_decided", status: current?.status ?? "UNKNOWN" };
  }

  await prisma.proofSubmission.update({
    where: { id: opts.submissionId },
    data: { status: "REJECTED", decidedAt: new Date() },
  });

  await deleteOriginalMessage(opts.client, submission);

  await logModerationAction({
    guildId: submission.guildId,
    action: "PROOF_REJECT",
    targetUserId: submission.submitterId,
    moderatorId: opts.moderatorId,
    metadata: { submissionId: submission.id },
  });

  return { ok: true };
}

async function deleteOriginalMessage(
  client: Client,
  submission: { guildId: string; channelId: string; originalMessageId: string; id: string }
) {
  try {
    const channel = await client.channels.fetch(submission.channelId);
    if (channel && channel.isTextBased()) {
      const msg = await (channel as TextChannel).messages.fetch(submission.originalMessageId).catch(() => null);
      if (msg) await msg.delete().catch(() => null);
    }
    await prisma.proofSubmission.update({ where: { id: submission.id }, data: { originalDeleted: true } });
  } catch (err) {
    logger.warn({ err, submissionId: submission.id }, "Could not delete original proof message");
  }
}

export function buildLockedButtons(submissionId: string) {
  return buildButtons(submissionId, true);
}

export { proofApprovedEmbed, proofRejectedEmbed };
