import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import { remarkReadingTime } from "./remark-reading-time.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://pcf.boakes.org",
  integrations: [mdx()],
  markdown: {
    remarkPlugins: [remarkReadingTime],
  },
});
