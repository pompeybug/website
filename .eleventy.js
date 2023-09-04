
module.exports = function(eleventyConfig) {
    eleventyConfig.addPassthroughCopy("**/*.jpg");
    eleventyConfig.addPassthroughCopy("**/*.jpeg");
    eleventyConfig.addPassthroughCopy("**/*.png");
    eleventyConfig.addPassthroughCopy("**/*.webp");
    eleventyConfig.addPassthroughCopy("**/*.svg");
    eleventyConfig.addPassthroughCopy("images");
    eleventyConfig.addPassthroughCopy("style");

    eleventyConfig.addFilter('excludeFilter', function (collection) {
        console.log("excludeFilter > ", collection);
        return collection.filter(item => item.data.exclude);
    });

    return {
        dir: {
            input: "src/articles",
            output: "_site",
			includes: "../../_includes"
        },
        breaks: false
    }
  };
  