import getReadingTime from "reading-time";
import { toString } from "mdast-util-to-string";
import strip from "remove-markdown";
import str from "strip-markdown";

// Taken from https://docs.astro.build/en/recipes/reading-time/
export function remarkReadingTime() {
  return function (tree, { data }) {
    const textOnPage = toString(tree);
    const readingTime = getReadingTime(textOnPage);
    data.astro.frontmatter.minutesRead = readingTime.text;
  };
}

export function remarkStripMarkdown() {
  return function (tree, { data }) {
    const treeClone = structuredClone(tree);
    // tree.children = tree.children.filter(
    //   (child) => child.type.toLowerCase() === "paragraph"
    // );
    // const textOnPage = toString(tree);
    // data.astro.frontmatter.description = strip(textOnPage, {
    //   useImgAltText: false,
    // });
    // return;
    const k = str({
      remove: [
        "list",
        "mdxjsEsm",
        "mdxJsxFlowElement",
        "mdxJsxTextElement",
        "heading",
        "image",
        ["break", () => ({ type: "text", value: " " })],
      ],
    })(treeClone);
    data.astro.frontmatter.description = toString(k);
    return;
    // strip imports, javascript stuff from mdx for descriptions
    treeClone.children = treeClone.children.filter(
      (child) => child.type.toLowerCase() === "paragraph"
    );

    data.astro.frontmatter.description = strip(textOnPage, {
      useImgAltText: false,
    });
  };
}
