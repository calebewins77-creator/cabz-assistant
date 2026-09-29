import { EmbedBuilder, User } from "discord.js";

export const BRAND = {
  primary: 0x5865f2,
  success: 0x57f287,
  danger: 0xed4245,
  warning: 0xfee75c,
  neutral: 0x2b2d31,
};

export function proofPendingEmbed(opts: {
  submitter: User;
  contentText: string | null;
  attachmentUrl: string | null;
}) {
  const embed = new EmbedBuilder()
    .setColor(BRAND.primary)
    .setAuthor({ name: `${opts.submitter.tag}`, iconURL: opts.submitter.displayAvatarURL() })
    .setTitle("Creator Code Proof Submitted")
    .setDescription(
      opts.contentText && opts.contentText.length > 0
        ? opts.contentText
        : "*No text provided — see attachment.*"
    )
    .addFields({ name: "Submitted by", value: `<@${opts.submitter.id}>`, inline: true }, { name: "Status", value: "⏳ Pending review", inline: true })
    .setFooter({ text: "CABZ Assistant · Creator Code Verification" })
    .setTimestamp();

  if (opts.attachmentUrl) embed.setImage(opts.attachmentUrl);
  return embed;
}

export function proofApprovedEmbed(opts: { submitterId: string; approverId: string; roleId: string }) {
  return new EmbedBuilder()
    .setColor(BRAND.success)
    .setDescription(
      `✅ Added role <@&${opts.roleId}> to <@${opts.submitterId}>\n\n**Approved by** <@${opts.approverId}>`
    )
    .setFooter({ text: "CABZ Assistant · Creator Code Verification" })
    .setTimestamp();
}

export function proofRejectedEmbed(opts: { submitterId: string; rejecterId: string }) {
  return new EmbedBuilder()
    .setColor(BRAND.danger)
    .setDescription(`❌ Code proof rejected for <@${opts.submitterId}>\n\n**Rejected by** <@${opts.rejecterId}>`)
    .setFooter({ text: "CABZ Assistant · Creator Code Verification" })
    .setTimestamp();
}

export function codepSuccessEmbed(opts: {
  userId: string;
  roleId: string;
  moderatorId: string;
  durationLabel: string;
}) {
  return new EmbedBuilder()
    .setColor(BRAND.success)
    .setDescription(
      `✅ Added role <@&${opts.roleId}> to <@${opts.userId}>\n\n**Moderator:** <@${opts.moderatorId}>\n**Duration:** ${opts.durationLabel}`
    )
    .setFooter({ text: "CABZ Assistant · #codep" })
    .setTimestamp();
}

export function errorEmbed(message: string) {
  return new EmbedBuilder().setColor(BRAND.danger).setDescription(`⚠️ ${message}`);
}

export function successEmbed(message: string) {
  return new EmbedBuilder().setColor(BRAND.success).setDescription(message);
}
