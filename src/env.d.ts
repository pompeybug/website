/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly DOMAIN: string;
  readonly HTTPS: boolean;
  readonly GITHUB_CLIENT_ID: string;
  readonly GITHUB_CLIENT_SECRET: string;
  readonly AUTH_TRUST_HOST: boolean;
  readonly AUTH_SECRET: string;
  readonly GITHUB_ORGANISATION: string;
  readonly GITHUB_CONTENT_REPOSITORY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
