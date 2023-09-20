const readingTime = require('eleventy-plugin-reading-time');

module.exports = function(config) {

    // copy all images across
    config.addPassthroughCopy("**/*.{jpg,jpeg,png,pdf,svg,webp}");

    // copt the css folder
    config.addPassthroughCopy("src/style");

    config.addPassthroughCopy("src/assets");

    // enable reading time estimates
    config.addPlugin(readingTime);


    return {
        dir: {
            input: "src",
            output: "docs",
        },
        breaks: false
    }
  };
  