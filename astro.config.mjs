import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import { remarkReadingTime, remarkStripMarkdown } from "./remark-plugins.mjs";
import robotsTxt from "astro-robots-txt";
import sitemap from "@astrojs/sitemap";
import partytown from "@astrojs/partytown";
import svelte from "@astrojs/svelte";
import { loadEnv } from "vite";
import purgecss from "astro-purgecss";
import Icons from "unplugin-icons/vite";

const { HTTPS, DOMAIN } = loadEnv(process.env.NODE_ENV, process.cwd(), "");

const site =
  HTTPS.toLowerCase() === "true" ? `https://${DOMAIN}` : `http://${DOMAIN}`;

// https://astro.build/config
export default defineConfig({
  site,
  integrations: [
    mdx(),
    robotsTxt({
      sitemap: `${site}/sitemap-index.xml`,
    }),
    sitemap(),
    partytown({
      config: {
        forward: "dataLayer.push",
      },
    }),
    svelte(),
    purgecss(),
  ],
  markdown: {
    remarkPlugins: [remarkReadingTime, remarkStripMarkdown],
  },
  prefetch: true,
  vite: {
    resolve: {
      alias: [
        {
          find: "icons:svelte",
          replacement: "~icons",
        },
        {
          find: "icons:astro",
          replacement: "~icons",
        },
      ],
    },
    plugins: [
      Icons({
        compiler: "svelte",
        autoInstall: true,
      }),
      Icons({
        compiler: "astro",
        autoInstall: true,
      }),
    ],
  },
});
