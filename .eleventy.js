
module.exports = function(eleventyConfig) {
    eleventyConfig.addPassthroughCopy("**/*.jpg");
    eleventyConfig.addPassthroughCopy("**/*.jpeg");
    eleventyConfig.addPassthroughCopy("**/*.png");
    eleventyConfig.addPassthroughCopy("**/*.webp");
    eleventyConfig.addPassthroughCopy("**/*.svg");
    eleventyConfig.addPassthroughCopy("images");
    eleventyConfig.addPassthroughCopy("style");

    // tags.md is used for tag pages so doesn't
    // exist as its own page.
    // eleventyConfig.ignores.add("**/tags.md");

    return {
        dir: {
            input: "src/articles",
            output: "_site",
			includes: "../../_includes"
        },
        breaks: false
    }
  };
  