import dns from "dns";
import { createBotClient, loginBot } from "./discord/bot";
import { createWebServer } from "./web/server";
import { config } from "./config";
import { logger } from "./logger";

// Some hosts advertise IPv6 routes that are actually unreachable, which makes
// outbound HTTPS/WSS connections (Discord REST + gateway) hang instead of
// failing over to IPv4. Prefer IPv4 results to avoid that class of hang.
dns.setDefaultResultOrder("ipv4first");

// Defense-in-depth: Node crashes the process on an unhandled rejection by
// default. A missed .catch() anywhere (a background timer, a stray promise)
// would otherwise take down the bot and dashboard together. Log and keep
// running instead — the real fix for any specific case is still to handle
// it at the source (see asyncHandler.ts for Express routes).
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
});

async function main() {
  const client = createBotClient();

  const app = createWebServer(client);
  app.listen(config.port, () => {
    logger.info({ port: config.port, url: config.publicUrl }, "CABZ Assistant dashboard listening");
  });

  // Runs independently of the HTTP server so a slow/failed Discord login
  // never blocks Render's port-binding check or the dashboard.
  loginBot(client);
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
