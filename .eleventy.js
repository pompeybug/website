const readingTime = require('eleventy-plugin-reading-time');

/** @param {import("@11ty/eleventy").UserConfig} config */
module.exports = function(config) {
    config.addPassthroughCopy("src/assets");
    config.addPassthroughCopy("src/articles/**/*.{jpg,jpeg,png,pdf,svg,webp}")

    // enable reading time estimates
    config.addPlugin(readingTime);

    return {
        dir: {
            input: "src",
            output: "docs",
        },
        breaks: false,
        passthroughFileCopy: true,
    }
  };
  