const readingTime = require('eleventy-plugin-reading-time');

/** @param {import("@11ty/eleventy").UserConfig} config */
module.exports = function(config) {
    config.addPassthroughCopy("./src/assets");
    config.addPassthroughCopy("./src/**/*.{jpg,jpeg,png,pdf,svg,webp}")

    config.addCollection('todoCollection', (collectionApi) => {
        return collectionApi.getAll().filter((item) => item.data.todo);
    });

    // enable reading time estimates
    config.addPlugin(readingTime);

    return {
        dir: {
            input: "src",
        },
        breaks: false,
        passthroughFileCopy: true,
    }
  };
  
