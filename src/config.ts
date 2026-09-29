import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  discordToken: required("DISCORD_TOKEN"),
  clientId: required("DISCORD_CLIENT_ID"),
  clientSecret: required("DISCORD_CLIENT_SECRET"),
  redirectUri: required("DISCORD_REDIRECT_URI"),
  databaseUrl: required("DATABASE_URL"),
  sessionSecret: required("SESSION_SECRET"),
  port: Number(process.env.PORT ?? 3000),
  publicUrl: process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 3000}`,
  defaultPrefix: process.env.DEFAULT_PREFIX ?? "!",
  proofChannelId: required("PROOF_CHANNEL_ID"),
  verifiedRoleId: required("VERIFIED_ROLE_ID"),
  staffRoleIds: (process.env.STAFF_ROLE_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
  isProduction: process.env.NODE_ENV === "production",
};
