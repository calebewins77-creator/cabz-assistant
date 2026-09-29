import { GuildMember, PermissionsBitField } from "discord.js";
import { getGuildConfig } from "../db/guildConfig";

/**
 * Staff = configured staff role IDs, OR native Administrator/Manage Roles permission.
 * The permission fallback ensures server owners/admins are never locked out before
 * they've configured STAFF_ROLE_IDS on the dashboard.
 */
export async function isStaff(member: GuildMember): Promise<boolean> {
  if (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.permissions.has(PermissionsBitField.Flags.ManageRoles)
  ) {
    return true;
  }

  const cfg = await getGuildConfig(member.guild.id);
  if (cfg.staffRoleIds.length === 0) return false;
  return member.roles.cache.some((role) => cfg.staffRoleIds.includes(role.id));
}
