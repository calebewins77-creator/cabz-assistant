import { Router } from "express";
import { Client } from "discord.js";
import { requireAuth, requireGuildAccess, getManageableGuilds } from "../middleware";
import { canManageGuild } from "../oauth";
import { getGuildConfig, invalidateGuildConfigCache } from "../../db/guildConfig";
import { prisma } from "../../db/client";
import { config } from "../../config";
import { asyncHandler } from "../asyncHandler";

export function buildDashboardRouter(client: Client) {
  const router = Router();
  router.use(requireAuth);

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const guilds = await getManageableGuilds(req);
      const manageable = guilds.filter((g) => canManageGuild(g.permissions, g.owner));
      const withStatus = manageable.map((g) => ({
        ...g,
        installed: client.guilds.cache.has(g.id),
      }));
      res.render("guild-list", { guilds: withStatus, user: req.session.user, inviteClientId: config.clientId });
    })
  );

  const guildAccess = requireGuildAccess(client);

  router.get(
    "/:guildId",
    guildAccess,
    asyncHandler(async (req, res) => {
      const guild = res.locals.guild;
      const cfg = await getGuildConfig(guild.id);
      const [pendingCount, recentActions] = await Promise.all([
        prisma.proofSubmission.count({ where: { guildId: guild.id, status: "PENDING" } }),
        prisma.moderationLog.findMany({ where: { guildId: guild.id }, orderBy: { createdAt: "desc" }, take: 8 }),
      ]);
      res.render("overview", {
        guild,
        cfg,
        user: req.session.user,
        memberCount: guild.memberCount,
        pendingCount,
        recentActions,
        botStatus: client.ws.status === 0 ? "Online" : "Reconnecting",
      });
    })
  );

  router.get(
    "/:guildId/verification",
    guildAccess,
    asyncHandler(async (req, res) => {
      const guild = res.locals.guild;
      const cfg = await getGuildConfig(guild.id);
      const submissions = await prisma.proofSubmission.findMany({
        where: { guildId: guild.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      res.render("verification", { guild, cfg, submissions, user: req.session.user });
    })
  );

  router.post(
    "/:guildId/verification",
    guildAccess,
    asyncHandler(async (req, res) => {
      const guild = res.locals.guild;
      const { proofChannelId, verifiedRoleId } = req.body;
      await prisma.guildConfig.update({
        where: { guildId: guild.id },
        data: {
          proofChannelId: sanitizeSnowflake(proofChannelId),
          verifiedRoleId: sanitizeSnowflake(verifiedRoleId),
        },
      });
      invalidateGuildConfigCache(guild.id);
      res.redirect(`/dashboard/${guild.id}/verification`);
    })
  );

  router.get(
    "/:guildId/moderation",
    guildAccess,
    asyncHandler(async (req, res) => {
      const guild = res.locals.guild;
      const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
      const logs = await prisma.moderationLog.findMany({
        where: {
          guildId: guild.id,
          ...(search
            ? { OR: [{ targetUserId: { contains: search } }, { moderatorId: { contains: search } }, { action: { contains: search.toUpperCase() } }] }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      res.render("moderation", { guild, logs, search, user: req.session.user });
    })
  );

  router.get(
    "/:guildId/settings",
    guildAccess,
    asyncHandler(async (req, res) => {
      const guild = res.locals.guild;
      const cfg = await getGuildConfig(guild.id);
      res.render("settings", { guild, cfg, user: req.session.user });
    })
  );

  router.post(
    "/:guildId/settings",
    guildAccess,
    asyncHandler(async (req, res) => {
      const guild = res.locals.guild;
      const { prefix, staffRoleIds, modLogChannelId } = req.body;
      const cleanPrefix = typeof prefix === "string" && prefix.trim().length > 0 && prefix.trim().length <= 5 ? prefix.trim() : "!";
      const roleIds = typeof staffRoleIds === "string"
        ? staffRoleIds.split(",").map((s) => s.trim()).filter((s) => /^\d{15,25}$/.test(s))
        : [];

      await prisma.guildConfig.update({
        where: { guildId: guild.id },
        data: { prefix: cleanPrefix, staffRoleIds: roleIds, modLogChannelId: sanitizeSnowflake(modLogChannelId) },
      });
      invalidateGuildConfigCache(guild.id);
      res.redirect(`/dashboard/${guild.id}/settings`);
    })
  );

  const comingSoon = (active: string, section: string, blurb: string) =>
    asyncHandler(async (req: any, res: any) => {
      res.render("coming-soon", { guild: res.locals.guild, active, section, blurb, user: req.session.user });
    });

  router.get("/:guildId/tickets", guildAccess, comingSoon("tickets", "Tickets", "Panels, transcripts, claim/unclaim, ratings and staff performance tracking are planned for Phase 2."));
  router.get("/:guildId/lfg", guildAccess, comingSoon("lfg", "LFG", "Region/rank/mode matchmaking posts and temporary party channels are planned for Phase 2."));
  router.get("/:guildId/events", guildAccess, comingSoon("events", "Events", "Tournament creation, signups, check-ins and leaderboards are planned for Phase 2."));
  router.get("/:guildId/leveling", guildAccess, comingSoon("leveling", "Leveling", "XP tracking, role rewards and leaderboards are planned for Phase 2."));
  router.get("/:guildId/commands", guildAccess, comingSoon("commands", "Custom Commands", "A visual custom-command builder is planned for Phase 2."));
  router.get("/:guildId/welcome", guildAccess, comingSoon("welcome", "Welcome & Goodbye", "Configurable join/leave embeds and autoroles are planned for Phase 2."));
  router.get("/:guildId/embeds", guildAccess, comingSoon("embeds", "Embed Builder", "A visual embed builder with live preview is planned for Phase 2."));

  return router;
}

function sanitizeSnowflake(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{15,25}$/.test(trimmed) ? trimmed : null;
}
