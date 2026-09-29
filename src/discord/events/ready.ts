import { Client } from "discord.js";
import { slashCommandData } from "../commands";
import { initRoleExpiryScheduler } from "../../services/roleGrantService";
import { initTempBanScheduler } from "../../services/tempBanScheduler";
import { logger } from "../../logger";

export function registerReady(client: Client) {
  client.once("ready", async () => {
    logger.info({ tag: client.user?.tag, guilds: client.guilds.cache.size }, "CABZ Assistant logged in");

    for (const guild of client.guilds.cache.values()) {
      try {
        await guild.commands.set(slashCommandData);
      } catch (err) {
        logger.error({ err, guildId: guild.id }, "Failed to register slash commands for guild");
      }
    }

    client.on("guildCreate", async (guild) => {
      try {
        await guild.commands.set(slashCommandData);
      } catch (err) {
        logger.error({ err, guildId: guild.id }, "Failed to register slash commands for new guild");
      }
    });

    await initRoleExpiryScheduler(client);
    await initTempBanScheduler(client);
  });
}
