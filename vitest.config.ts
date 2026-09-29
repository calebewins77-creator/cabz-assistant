import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      DISCORD_TOKEN: "test-token",
      DISCORD_CLIENT_ID: "test-client-id",
      DISCORD_CLIENT_SECRET: "test-secret",
      DISCORD_REDIRECT_URI: "http://localhost:3000/auth/discord/callback",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      SESSION_SECRET: "test-session-secret",
      PROOF_CHANNEL_ID: "1554078641984638977",
      VERIFIED_ROLE_ID: "1554350014497558529",
    },
  },
});
