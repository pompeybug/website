/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
    readonly DOMAIN: string;
    readonly HTTPS: boolean;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }