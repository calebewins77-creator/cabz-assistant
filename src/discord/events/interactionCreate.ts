import { Client, Interaction } from "discord.js";
import { commandsByName } from "../commands";
import { isStaff } from "../permissions";
import { errorEmbed, proofApprovedEmbed, proofRejectedEmbed } from "../embeds";
import { approveProof, rejectProof } from "../../services/proofService";
import { getGuildConfig } from "../../db/guildConfig";
import { prisma } from "../../db/client";
import { logger } from "../../logger";

export function registerInteractionCreate(client: Client) {
  client.on("interactionCreate", async (interaction: Interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction, client);
      } else if (interaction.isButton() && interaction.customId.startsWith("proof:")) {
        await handleProofButton(interaction, client);
      }
    } catch (err) {
      logger.error({ err }, "Unhandled error in interactionCreate");
    }
  });
}

async function handleSlashCommand(interaction: any, client: Client) {
  const command = commandsByName.get(interaction.commandName);
  if (!command) return;

  if (command.requiresStaff) {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({ embeds: [errorEmbed("This command can only be used in a server.")], ephemeral: true });
      return;
    }
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member || !(await isStaff(member))) {
      await interaction.reply({ embeds: [errorEmbed("You do not have permission to use this command.")], ephemeral: true });
      return;
    }
  }

  await command.runSlash(interaction, client);
}

async function handleProofButton(interaction: any, client: Client) {
  const [, action, submissionId] = interaction.customId.split(":");

  if (!interaction.guild || !interaction.member) return;
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member || !(await isStaff(member))) {
    await interaction.reply({ embeds: [errorEmbed("Only authorized staff can approve or reject proof submissions.")], ephemeral: true });
    return;
  }

  await interaction.deferUpdate();

  if (action === "approve") {
    const result = await approveProof({ client, submissionId, moderatorId: interaction.user.id });
    if (result.ok) {
      const cfg = await getGuildConfig(interaction.guild.id);
      await interaction.editReply({
        embeds: [proofApprovedEmbed({ submitterId: await submitterIdOf(submissionId), approverId: interaction.user.id, roleId: cfg.verifiedRoleId ?? "" })],
        components: [],
      });
      return;
    }
    await respondToFailure(interaction, result);
    return;
  }

  if (action === "reject") {
    const result = await rejectProof({ client, submissionId, moderatorId: interaction.user.id });
    if (result.ok) {
      await interaction.editReply({
        embeds: [proofRejectedEmbed({ submitterId: await submitterIdOf(submissionId), rejecterId: interaction.user.id })],
        components: [],
      });
      return;
    }
    await respondToFailure(interaction, result);
  }
}

async function submitterIdOf(submissionId: string): Promise<string> {
  const submission = await prisma.proofSubmission.findUnique({ where: { id: submissionId } });
  return submission?.submitterId ?? "unknown";
}

async function respondToFailure(interaction: any, result: { reason: string; message?: string; status?: string }) {
  const messages: Record<string, string> = {
    already_decided: `This submission was already ${(result.status ?? "decided").toLowerCase()}.`,
    member_left: "That user is no longer in the server — cannot approve. They must rejoin first.",
    role_error: result.message ?? "Role assignment failed.",
    not_found: "Submission record not found (it may predate this deployment).",
  };
  await interaction.followUp({
    embeds: [errorEmbed(messages[result.reason] ?? "Something went wrong.")],
    ephemeral: true,
  });
}
