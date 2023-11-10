import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import { remarkReadingTime, remarkStripMarkdown } from "./remark-plugins.mjs";
import robotsTxt from "astro-robots-txt";
import sitemap from "@astrojs/sitemap";
import partytown from "@astrojs/partytown";
import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
  site: "https://pompeybug.co.uk",
  integrations: [
    mdx(),
    robotsTxt(),
    sitemap(),
    partytown({
      config: {
        forward: "dataLayer.push",
      },
    }),
    svelte(),
  ],
  markdown: {
    remarkPlugins: [remarkReadingTime, remarkStripMarkdown],
  },
  prefetch: true,
});
