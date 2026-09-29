import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { config } from "../config";
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

const pgPool = new Pool({ connectionString: config.databaseUrl });
const PgSession = ConnectPgSimple(session);

export const sessionMiddleware = session({
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
