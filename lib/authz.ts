import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";

export type CurrentUser = {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
};

export const GUILD_FORBIDDEN_MESSAGE = "このDiscordサーバーに参加しているアカウントのみ利用できます";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  return getUserFromSession(session);
}

export function getUserFromSession(session: Session | null): CurrentUser | null {
  if (!session?.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    username: session.user.username,
    globalName: session.user.globalName,
    avatar: session.user.avatar
  };
}

export async function requireLogin(callbackUrl = "/profile"): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return user;
}

export function isAdminDiscordId(discordUserId: string): boolean {
  return getAdminDiscordIds().includes(discordUserId);
}

export async function requireAdmin(callbackUrl = "/admin"): Promise<CurrentUser> {
  const user = await requireLogin(callbackUrl);

  if (!isAdminDiscordId(user.id)) {
    throw new AdminForbiddenError();
  }

  return user;
}

export async function requireAdminApi(): Promise<CurrentUser | NextResponse> {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminDiscordId(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return user;
}

export async function checkGuildMembership(discordUserId: string): Promise<boolean> {
  if (process.env.REQUIRE_GUILD_MEMBERSHIP !== "true") {
    return true;
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    return false;
  }

  const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}`, {
    headers: { Authorization: `Bot ${botToken}` },
    cache: "no-store"
  });

  return response.ok;
}

export async function requireGuildMembershipApi(discordUserId: string): Promise<NextResponse | null> {
  const isMember = await checkGuildMembership(discordUserId);
  return isMember ? null : NextResponse.json({ error: GUILD_FORBIDDEN_MESSAGE }, { status: 403 });
}

export async function requireGuildMembershipPage(discordUserId: string): Promise<void> {
  const isMember = await checkGuildMembership(discordUserId);

  if (!isMember) {
    throw new GuildForbiddenError();
  }
}

export function formatLimitBreak(limitBreak: number): string {
  return limitBreak === -1 ? "未所持" : `${limitBreak}凸`;
}

export function formatSeaWeaponLevel(seaWeaponLevel: number | null): string {
  return seaWeaponLevel === null ? "なし" : `${seaWeaponLevel}Lv.`;
}

export class AdminForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "AdminForbiddenError";
  }
}

export class GuildForbiddenError extends Error {
  constructor() {
    super(GUILD_FORBIDDEN_MESSAGE);
    this.name = "GuildForbiddenError";
  }
}

function getAdminDiscordIds(): string[] {
  return (process.env.ADMIN_DISCORD_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}
