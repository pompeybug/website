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

      let organisationMembersRes;

      try {
        organisationMembersRes = await fetch(
          `https://api.github.com/orgs/${
            import.meta.env.GITHUB_ORGANISATION
          }/members`,
          {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
          }
        );
      } catch (err) {
        console.error(err);
        return false;
      }

      if (!organisationMembersRes.ok) {
        return false;
      }

      const organisationMembers = await organisationMembersRes.json();

      return organisationMembers.some((member) => member.id === profile.id);
    },
  },
});
