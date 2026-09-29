import { createBotClient, loginBot } from "./discord/bot";
import { createWebServer } from "./web/server";
import { config } from "./config";
import { logger } from "./logger";

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
