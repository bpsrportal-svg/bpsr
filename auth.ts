import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

type DiscordProfile = {
  id?: unknown;
  username?: unknown;
  global_name?: unknown;
  avatar?: unknown;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID ?? "",
      clientSecret: process.env.AUTH_DISCORD_SECRET ?? "",
      authorization: {
        params: {
          scope: "identify"
        }
      }
    })
  ],
  callbacks: {
    jwt({ token, profile }) {
      if (profile) {
        const discordProfile = profile as DiscordProfile;

        token.discordUserId = typeof discordProfile.id === "string" ? discordProfile.id : "";
        token.discordUsername = typeof discordProfile.username === "string" ? discordProfile.username : "";
        token.discordGlobalName = typeof discordProfile.global_name === "string" ? discordProfile.global_name : null;
        token.discordAvatar = typeof discordProfile.avatar === "string" ? discordProfile.avatar : null;
      }

      return token;
    },
    session({ session, token }) {
      session.user.id = token.discordUserId ?? "";
      session.user.username = token.discordUsername ?? "";
      session.user.globalName = token.discordGlobalName ?? null;
      session.user.avatar = token.discordAvatar ?? null;
      return session;
    }
  }
});
