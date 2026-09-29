import { Client } from "discord.js";
import { prisma } from "../db/client";
import { logger } from "../logger";

const timers = new Map<string, NodeJS.Timeout>();
const MAX_TIMEOUT_MS = 2_147_000_000; // setTimeout max ~24.8 days; sweep handles the rest

export async function grantRole(opts: {
  client: Client;
  guildId: string;
  userId: string;
  roleId: string;
  grantedBy: string;
  reason: string;
  expiresAt: Date | null;
}) {
  const guild = await opts.client.guilds.fetch(opts.guildId);
  const member = await guild.members.fetch(opts.userId).catch(() => null);
  if (!member) {
    throw new Error("That user is no longer in the server.");
  }

  await member.roles.add(opts.roleId, opts.reason);

  const grant = await prisma.roleGrant.create({
    data: {
      guildId: opts.guildId,
      userId: opts.userId,
      roleId: opts.roleId,
      grantedBy: opts.grantedBy,
      reason: opts.reason,
      expiresAt: opts.expiresAt,
    },
  });

  if (opts.expiresAt) {
    scheduleExpiry(opts.client, grant.id);
  }

  return grant;
}

export function scheduleExpiry(client: Client, grantId: string) {
  if (timers.has(grantId)) return;

  const run = async () => {
    timers.delete(grantId);
    const grant = await prisma.roleGrant.findUnique({ where: { id: grantId } });
    if (!grant || grant.revoked || !grant.expiresAt) return;

    const remaining = grant.expiresAt.getTime() - Date.now();
    if (remaining > 0) {
      scheduleTimer(grantId, remaining, run);
      return;
    }

    await revokeExpiredGrant(client, grantId).catch((err) =>
      logger.error({ err, grantId }, "Failed to revoke expired role grant")
    );
  };

  prisma.roleGrant
    .findUnique({ where: { id: grantId } })
    .then((grant) => {
      if (!grant || grant.revoked || !grant.expiresAt) return;
      const remaining = grant.expiresAt.getTime() - Date.now();
      scheduleTimer(grantId, Math.max(remaining, 0), run);
    })
    .catch((err) => logger.error({ err, grantId }, "Failed to schedule role expiry"));
}

function scheduleTimer(grantId: string, delay: number, run: () => void) {
  const clamped = Math.min(delay, MAX_TIMEOUT_MS);
  const timer = setTimeout(run, clamped);
  timers.set(grantId, timer);
}

async function revokeExpiredGrant(client: Client, grantId: string) {
  const grant = await prisma.roleGrant.update({
    where: { id: grantId, revoked: false },
    data: { revoked: true, removedAt: new Date() },
  }).catch(() => null);
  if (!grant) return;

  const guild = await client.guilds.fetch(grant.guildId).catch(() => null);
  if (!guild) return;
  const member = await guild.members.fetch(grant.userId).catch(() => null);
  if (!member) return;

  await member.roles.remove(grant.roleId, "Temporary role grant expired").catch((err) =>
    logger.warn({ err, grantId }, "Could not remove expired role (permissions or already removed)")
  );
}

/** Called once on boot: reschedules every still-active temporary grant, and sweeps overdue ones. */
export async function initRoleExpiryScheduler(client: Client) {
  const active = await prisma.roleGrant.findMany({
    where: { revoked: false, expiresAt: { not: null } },
  });

  for (const grant of active) {
    scheduleExpiry(client, grant.id);
  }

  // Fallback sweep every minute in case setTimeout scheduling was missed (e.g. very long durations, clock drift).
  setInterval(async () => {
    const overdue = await prisma.roleGrant.findMany({
      where: { revoked: false, expiresAt: { lte: new Date() } },
    });
    for (const grant of overdue) {
      await revokeExpiredGrant(client, grant.id).catch((err) =>
        logger.error({ err, grantId: grant.id }, "Sweep failed to revoke expired grant")
      );
    }
  }, 60_000);

  logger.info({ count: active.length }, "Role expiry scheduler initialized");
}
