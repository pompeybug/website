import GitHub from "@auth/core/providers/github";
import { defineConfig } from "auth-astro";

export default defineConfig({
  providers: [
    GitHub({
      clientId: import.meta.env.GITHUB_CLIENT_ID,
      clientSecret: import.meta.env.GITHUB_CLIENT_SECRET,
      authorization: { params: { scope: "repo read:org" } },
    }),
  ],
  callbacks: {
    async signIn({ profile, account }) {
      if (!profile?.id || !account?.access_token) {
        return false;
      }

      const organisationMembers = await fetch(
        `https://api.github.com/orgs/${
          import.meta.env.GITHUB_ORGANISATION
        }/members`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${account.access_token}`,
          },
        }
      );

      if (!organisationMembers.ok) {
        return false;
      }

      const body = await organisationMembers.json();

      return body.some((member) => member.id === profile.id);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
    async token({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }

      return token;
    },
  },
});
