import { prisma } from "./client";
import { config } from "../config";

export type GuildConfigRecord = Awaited<ReturnType<typeof prisma.guildConfig.upsert>>;

const cache = new Map<string, { value: GuildConfigRecord; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

export async function getGuildConfig(guildId: string): Promise<GuildConfigRecord> {
  const cached = cache.get(guildId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const record = await prisma.guildConfig.upsert({
    where: { guildId },
    update: {},
    create: {
      guildId,
      prefix: config.defaultPrefix,
      proofChannelId: config.proofChannelId,
      verifiedRoleId: config.verifiedRoleId,
      staffRoleIds: config.staffRoleIds,
    },
  });

  cache.set(guildId, { value: record, expiresAt: Date.now() + CACHE_TTL_MS });
  return record;
}

export function invalidateGuildConfigCache(guildId: string) {
  cache.delete(guildId);
}
