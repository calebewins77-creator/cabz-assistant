import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { config } from "../config";
import { logger } from "../logger";
import type { DiscordUser, DiscordUserGuild } from "./oauth";

declare module "express-session" {
  interface SessionData {
    oauthState?: string;
    user?: DiscordUser;
    accessToken?: string;
    manageableGuilds?: DiscordUserGuild[];
    guildsFetchedAt?: number;
  }
}

let cached: ReturnType<typeof session> | null = null;

/**
 * Built lazily (not at module import time) so a bad DATABASE_URL fails
 * loudly once the web server actually starts, instead of hanging the
 * whole process during Node's module-resolution phase before any of
 * our own logging runs.
 */
export function getSessionMiddleware() {
  if (cached) return cached;

  const pgPool = new Pool({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: 10_000,
  });
  pgPool.on("error", (err) => logger.error({ err }, "Idle Postgres session pool client error"));

  const PgSession = ConnectPgSimple(session);

  cached = session({
    store: new PgSession({ pool: pgPool, tableName: "web_sessions", createTableIfMissing: true }),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  });

  return cached;
}
