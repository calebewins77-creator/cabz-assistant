import { Guild, GuildMember } from "discord.js";

const MENTION_RE = /^<@!?(\d+)>$/;

export function extractUserId(raw: string): string | null {
  const mentionMatch = raw.match(MENTION_RE);
  if (mentionMatch) return mentionMatch[1];
  if (/^\d{15,25}$/.test(raw)) return raw;
  return null;
}

export async function resolveMember(guild: Guild, raw: string): Promise<GuildMember | null> {
  const id = extractUserId(raw);
  if (!id) return null;
  return guild.members.fetch(id).catch(() => null);
}
