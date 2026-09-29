import { createDiscordClient } from "./client";
import { registerReady } from "./events/ready";
import { registerMessageCreate } from "./events/messageCreate";
import { registerInteractionCreate } from "./events/interactionCreate";
import { config } from "../config";
import { logger } from "../logger";

export async function startBot() {
  const client = createDiscordClient();

  registerReady(client);
  registerMessageCreate(client);
  registerInteractionCreate(client);

  client.on("error", (err) => logger.error({ err }, "Discord client error"));
  client.on("shardError", (err) => logger.error({ err }, "Discord shard error"));

  await client.login(config.discordToken);
  return client;
}
