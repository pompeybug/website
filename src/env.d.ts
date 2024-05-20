/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    session: import("@auth/core/types").Session | null;
  }
}

interface ImportMetaEnv {
    readonly DOMAIN: string;
    readonly HTTPS: boolean;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }