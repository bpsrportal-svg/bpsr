import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      globalName: string | null;
      avatar: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    discordUserId?: string;
    discordUsername?: string;
    discordGlobalName?: string | null;
    discordAvatar?: string | null;
  }
}
