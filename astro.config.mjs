import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import { remarkReadingTime } from "./remark-reading-time.mjs";
import robotsTxt from "astro-robots-txt";
import sitemap from "@astrojs/sitemap";

import prefetch from "@astrojs/prefetch";

// https://astro.build/config
export default defineConfig({
  site: "https://pcf.boakes.org",
  integrations: [mdx(), robotsTxt(), sitemap(), prefetch()],
  markdown: {
    remarkPlugins: [remarkReadingTime]
  }
});