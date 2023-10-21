import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import { remarkReadingTime, remarkStripMarkdown } from "./remark-plugins.mjs";
import robotsTxt from "astro-robots-txt";
import sitemap from "@astrojs/sitemap";
import prefetch from "@astrojs/prefetch";
import partytown from "@astrojs/partytown";

// https://astro.build/config
export default defineConfig({
  site: "https://pcf.boakes.org",
  integrations: [
    mdx(),
    robotsTxt(),
    sitemap(),
    prefetch(),
    partytown({
      config: {
        forward: "dataLayer.push",
      },
    }),
  ],
  markdown: {
    remarkPlugins: [remarkReadingTime, remarkStripMarkdown],
  },
});
