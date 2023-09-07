
module.exports = function(config) {

    // copy all images across
    config.addPassthroughCopy("**/*.{jpg,jpeg,png,pdf,svg,webp}");

    // copt the css folder
    config.addPassthroughCopy("style");

    return {
        dir: {
            input: "src/articles",
            output: "_site",
			includes: "../../_includes"
        },
        breaks: false
    }
  };
  