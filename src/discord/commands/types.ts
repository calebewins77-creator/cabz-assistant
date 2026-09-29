import { ChatInputCommandInteraction, Client, Message, SlashCommandBuilder } from "discord.js";

export interface BotCommand {
  name: string;
  data: SlashCommandBuilder;
  requiresStaff: boolean;
  runSlash(interaction: ChatInputCommandInteraction, client: Client): Promise<void>;
  runPrefix(message: Message, args: string[], client: Client): Promise<void>;
}
