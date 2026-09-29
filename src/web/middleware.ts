import { NextFunction, Request, Response } from "express";
import { Client } from "discord.js";
import { canManageGuild, fetchDiscordUserGuilds } from "./oauth";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user || !req.session.accessToken) {
    return res.redirect("/auth/login");
  }
  next();
}

const GUILDS_CACHE_TTL_MS = 5 * 60_000;

export async function getManageableGuilds(req: Request) {
  const now = Date.now();
  if (req.session.manageableGuilds && req.session.guildsFetchedAt && now - req.session.guildsFetchedAt < GUILDS_CACHE_TTL_MS) {
    return req.session.manageableGuilds;
  }
  const guilds = await fetchDiscordUserGuilds(req.session.accessToken!);
  req.session.manageableGuilds = guilds;
  req.session.guildsFetchedAt = now;
  return guilds;
}

/**
 * Blocks a request unless the logged-in user has Manage Server / Administrator
 * permission on :guildId AND CABZ Assistant is actually installed there.
 * This is the server-side check preventing URL/param tampering across guilds.
 */
export function requireGuildAccess(client: Client) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const guildId = req.params.guildId;
    if (!guildId) return res.status(400).send("Missing guild id");

    const botGuild = client.guilds.cache.get(guildId);
    if (!botGuild) return res.status(404).render("error", { message: "CABZ Assistant is not in that server." });

    const guilds = await getManageableGuilds(req);
    const match = guilds.find((g) => g.id === guildId);
    if (!match || !canManageGuild(match.permissions, match.owner)) {
      return res.status(403).render("error", { message: "You do not have permission to manage that server." });
    }

    res.locals.guild = botGuild;
    next();
  };
}
