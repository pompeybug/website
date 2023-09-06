
module.exports = function(eleventyConfig) {
    eleventyConfig.addPassthroughCopy("**/*.jpg");
    eleventyConfig.addPassthroughCopy("**/*.jpeg");
    eleventyConfig.addPassthroughCopy("**/*.png");
    eleventyConfig.addPassthroughCopy("**/*.webp");
    eleventyConfig.addPassthroughCopy("**/*.svg");
    eleventyConfig.addPassthroughCopy("images");
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
  