import { Client } from "discord.js";
import { createDiscordClient } from "./client";
import { registerReady } from "./events/ready";
import { registerMessageCreate } from "./events/messageCreate";
import { registerInteractionCreate } from "./events/interactionCreate";
import { config } from "../config";
import { logger } from "../logger";

const LOGIN_TIMEOUT_MS = 60_000;

/** Synchronous setup only — safe to call before the web server starts listening. */
export function createBotClient(): Client {
  const client = createDiscordClient();

  registerReady(client);
  registerMessageCreate(client);
  registerInteractionCreate(client);

  client.on("error", (err) => logger.error({ err }, "Discord client error"));
  client.on("shardError", (err) => logger.error({ err }, "Discord shard error"));
  client.on("debug", (info) => logger.debug({ discordDebug: info }, "discord.js debug"));
  client.on("warn", (info) => logger.warn({ discordWarn: info }, "discord.js warning"));

  return client;
}

/**
 * Logs in with a hard timeout so a stuck gateway handshake fails loudly
 * (and the process can report a clear error) instead of hanging forever.
 * Runs independently of the web server so the dashboard stays reachable
 * even if Discord login is slow or failing.
 */
export async function loginBot(client: Client): Promise<void> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Discord login timed out after ${LOGIN_TIMEOUT_MS}ms`)), LOGIN_TIMEOUT_MS);
  });

  try {
    await Promise.race([client.login(config.discordToken), timeout]);
    logger.info("Discord login succeeded");
  } catch (err) {
    logger.error({ err }, "Discord login failed or timed out; web dashboard remains available");
  }
}
