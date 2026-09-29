import { Client } from "discord.js";
import { prisma } from "../db/client";
import { logger } from "../logger";
import { logModerationAction } from "./moderationLog";

const timers = new Map<string, NodeJS.Timeout>();
const MAX_TIMEOUT_MS = 2_147_000_000;

export function scheduleTempBanExpiry(client: Client, tempBanId: string) {
  if (timers.has(tempBanId)) return;

  const run = async () => {
    timers.delete(tempBanId);
    const record = await prisma.tempBan.findUnique({ where: { id: tempBanId } });
    if (!record || record.liftedAt) return;

    const remaining = record.expiresAt.getTime() - Date.now();
    if (remaining > 0) {
      const timer = setTimeout(run, Math.min(remaining, MAX_TIMEOUT_MS));
      timers.set(tempBanId, timer);
      return;
    }

    await liftExpiredBan(client, tempBanId).catch((err) =>
      logger.error({ err, tempBanId }, "Failed to lift expired temp ban")
    );
  };

  prisma.tempBan
    .findUnique({ where: { id: tempBanId } })
    .then((record) => {
      if (!record || record.liftedAt) return;
      const remaining = record.expiresAt.getTime() - Date.now();
      const timer = setTimeout(run, Math.max(Math.min(remaining, MAX_TIMEOUT_MS), 0));
      timers.set(tempBanId, timer);
    })
    .catch((err) => logger.error({ err, tempBanId }, "Failed to schedule temp ban expiry"));
}

async function liftExpiredBan(client: Client, tempBanId: string) {
  const record = await prisma.tempBan
    .update({ where: { id: tempBanId, liftedAt: null }, data: { liftedAt: new Date() } })
    .catch(() => null);
  if (!record) return;

  const guild = await client.guilds.fetch(record.guildId).catch(() => null);
  if (!guild) return;

  await guild.members.unban(record.userId, "Temporary ban expired").catch((err) =>
    logger.warn({ err, tempBanId }, "Could not lift temp ban (already unbanned or permission issue)")
  );

  await logModerationAction({
    guildId: record.guildId,
    action: "UNBAN",
    targetUserId: record.userId,
    moderatorId: client.user?.id ?? "system",
    reason: "Temporary ban expired",
  });
}

export async function initTempBanScheduler(client: Client) {
  const active = await prisma.tempBan.findMany({ where: { liftedAt: null } });
  for (const record of active) scheduleTempBanExpiry(client, record.id);

  setInterval(async () => {
    const overdue = await prisma.tempBan.findMany({
      where: { liftedAt: null, expiresAt: { lte: new Date() } },
    });
    for (const record of overdue) {
      await liftExpiredBan(client, record.id).catch((err) =>
        logger.error({ err, tempBanId: record.id }, "Sweep failed to lift expired temp ban")
      );
    }
  }, 60_000);

  logger.info({ count: active.length }, "Temp ban scheduler initialized");
}
