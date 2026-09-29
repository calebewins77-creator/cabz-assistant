import { GuildMember } from "discord.js";
import { getGuildConfig } from "../db/guildConfig";

/**
 * Staff = holds one of the configured staff roles, or is the server owner.
 * The owner check is a narrow safety net so a misconfigured STAFF_ROLE_IDS
 * can never lock the owner out of their own server. Administrator/Manage
 * Roles permission alone is deliberately NOT sufficient — only the
 * configured role (or owner) counts, so this is enforced strictly.
 */
export async function isStaff(member: GuildMember): Promise<boolean> {
  if (member.id === member.guild.ownerId) return true;

  const cfg = await getGuildConfig(member.guild.id);
  if (cfg.staffRoleIds.length === 0) return false;
  return member.roles.cache.some((role) => cfg.staffRoleIds.includes(role.id));
}
