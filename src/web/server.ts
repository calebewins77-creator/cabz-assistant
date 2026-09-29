import express from "express";
import path from "path";
import rateLimit from "express-rate-limit";
import { Client } from "discord.js";
import { getSessionMiddleware } from "./session";
import { authRouter } from "./routes/auth";
import { buildDashboardRouter } from "./routes/dashboard";
import { logger } from "../logger";

export function createWebServer(client: Client) {
  const app = express();

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "..", "..", "views"));
  app.use(express.static(path.join(__dirname, "..", "..", "public")));
  app.use(express.urlencoded({ extended: true }));
  app.use(getSessionMiddleware());

  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", discordReady: client.isReady() });
  });

  // Temporary diagnostic route to isolate a network-level connectivity issue
  // to Discord's API from this host. Remove once resolved.
  app.get("/debug/net", async (_req, res) => {
    const targets = [
      "https://discord.com/api/v10/gateway",
      "https://dns.google/resolve?name=discord.com&type=A",
    ];
    const results: Record<string, unknown> = {};
    for (const url of targets) {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8000);
        const r = await fetch(url, { signal: controller.signal });
        clearTimeout(t);
        results[url] = { ok: true, status: r.status, ms: Date.now() - start, body: await r.text() };
      } catch (err: any) {
        results[url] = { ok: false, ms: Date.now() - start, error: err?.message ?? String(err) };
      }
    }
    res.json(results);
  });

  app.get("/", (req, res) => {
    if (req.session.user) return res.redirect("/dashboard");
    res.render("landing");
  });

  app.use("/auth", authRouter);
  app.use("/dashboard", buildDashboardRouter(client));

  app.use((req, res) => {
    res.status(404).render("error", { message: "Page not found." });
  });

  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, "Unhandled web error");
    res.status(500).render("error", { message: "Something went wrong on our end." });
  });

  return app;
}
