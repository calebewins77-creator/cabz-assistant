import express from "express";
import path from "path";
import rateLimit from "express-rate-limit";
import { Client } from "discord.js";
import { sessionMiddleware } from "./session";
import { authRouter } from "./routes/auth";
import { buildDashboardRouter } from "./routes/dashboard";
import { logger } from "../logger";

export function createWebServer(client: Client) {
  const app = express();

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "..", "..", "views"));
  app.use(express.static(path.join(__dirname, "..", "..", "public")));
  app.use(express.urlencoded({ extended: true }));
  app.use(sessionMiddleware);

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
