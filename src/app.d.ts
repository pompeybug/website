import type { DefaultSession } from "@auth/core/types";

declare module "@auth/core/types" {
  interface Session {
    user?: DefaultSession["user"];
    expires: DefaultSession["expires"];
    accessToken: string;
  }
}
