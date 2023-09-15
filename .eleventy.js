const readingTime = require('eleventy-plugin-reading-time');

module.exports = function(config) {

    // copy all images across
    config.addPassthroughCopy("**/*.{jpg,jpeg,png,pdf,svg,webp}");

    // copt the css folder
    config.addPassthroughCopy("style");

    config.addPassthroughCopy("assets");

    // enable reading time estimates
    config.addPlugin(readingTime);


    return {
        dir: {
            input: "src/articles",
            output: "docs",
			includes: "../../_includes"
        },
        breaks: false
    }
  };
  