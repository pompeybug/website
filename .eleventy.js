
module.exports = function(eleventyConfig) {

    // copy all images across
    eleventyConfig.addPassthroughCopy("**/*.{jpg,jpeg,png,pdf,svg,webp}");

    // copt the css folder
    eleventyConfig.addPassthroughCopy("style");

    return {
        dir: {
            input: "src/articles",
            output: "_site",
			includes: "../../_includes"
        },
        breaks: false
    }
  };
  