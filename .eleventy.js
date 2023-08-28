module.exports = function(eleventyConfig) {
    eleventyConfig.addPassthroughCopy("**/*.jpg, **/*.jpeg, **/*.png");
    eleventyConfig.addPassthroughCopy("images");
    eleventyConfig.addPassthroughCopy("style");
    eleventyConfig.setQuietMode(true);
    return {
        dir: {
            input: "src/articles",
            output: "_site",
			includes: "../../_includes",
            data: "../_data",
        },
        breaks: false
    }
  };
  