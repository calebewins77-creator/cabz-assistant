import { Router } from "express";
import crypto from "crypto";
import { buildAuthorizeUrl, exchangeCodeForToken, fetchDiscordUser, fetchDiscordUserGuilds } from "../oauth";
import { logger } from "../../logger";

export const authRouter = Router();

authRouter.get("/login", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state;
  res.redirect(buildAuthorizeUrl(state));
});

authRouter.get("/discord/callback", async (req, res) => {
  const { code, state } = req.query;

  if (typeof code !== "string" || typeof state !== "string" || state !== req.session.oauthState) {
    return res.status(400).render("error", { message: "Invalid or expired login attempt. Please try again." });
  }
  req.session.oauthState = undefined;

  try {
    const token = await exchangeCodeForToken(code);
    const user = await fetchDiscordUser(token.access_token);
    const guilds = await fetchDiscordUserGuilds(token.access_token);

    req.session.user = user;
    req.session.accessToken = token.access_token;
    req.session.manageableGuilds = guilds;
    req.session.guildsFetchedAt = Date.now();

    res.redirect("/dashboard");
  } catch (err) {
    logger.error({ err }, "Discord OAuth callback failed");
    res.status(500).render("error", { message: "Login failed. Please try again." });
  }
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});
