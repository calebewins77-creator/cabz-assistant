import { config } from "../config";

const API_BASE = "https://discord.com/api/v10";

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "identify guilds",
    state,
    prompt: "none",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export async function exchangeCodeForToken(code: string): Promise<DiscordTokenResponse> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });

  const res = await fetch(`${API_BASE}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`Discord token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<DiscordTokenResponse>;
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch(`${API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch Discord user: ${res.status}`);
  return res.json() as Promise<DiscordUser>;
}

export interface DiscordUserGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export class DiscordAPIRequestError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function fetchDiscordUserGuilds(accessToken: string): Promise<DiscordUserGuild[]> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${API_BASE}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) return res.json() as Promise<DiscordUserGuild[]>;

    if (res.status === 429 && attempt === 0) {
      const retryAfterSec = Number(res.headers.get("retry-after")) || 1;
      await new Promise((r) => setTimeout(r, Math.min(retryAfterSec * 1000, 3000)));
      continue;
    }
    throw new DiscordAPIRequestError(`Failed to fetch user guilds: ${res.status}`, res.status);
  }
  throw new DiscordAPIRequestError("Failed to fetch user guilds: rate limited", 429);
}

const ADMINISTRATOR = BigInt(0x8);
const MANAGE_GUILD = BigInt(0x20);

export function canManageGuild(permissions: string, owner: boolean): boolean {
  if (owner) return true;
  const bits = BigInt(permissions);
  return (bits & ADMINISTRATOR) === ADMINISTRATOR || (bits & MANAGE_GUILD) === MANAGE_GUILD;
}
