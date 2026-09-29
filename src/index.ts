import { startBot } from "./discord/bot";
import { createWebServer } from "./web/server";
import { config } from "./config";
import { logger } from "./logger";

async function main() {
  const client = await startBot();

  const app = createWebServer(client);
  app.listen(config.port, () => {
    logger.info({ port: config.port, url: config.publicUrl }, "CABZ Assistant dashboard listening");
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
