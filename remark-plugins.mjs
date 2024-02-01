import getReadingTime from "reading-time";
import { toString } from "mdast-util-to-string";
import strip from 'remove-markdown';

export function remarkReadingTime() {
  return function (tree, { data }) {
    const textOnPage = toString(tree);
    const readingTime = getReadingTime(textOnPage);
    data.astro.frontmatter.minutesRead = readingTime.text;
  };
}

export function remarkStripMarkdown() {
  return function (tree, { data }) {
    // strip imports, javascript stuff from mdx for descriptions
    tree.children = tree.children.filter((child) => !child.type.toLowerCase().startsWith('mdxjs'));

    const textOnPage = toString(tree);
    data.astro.frontmatter.strippedBody = strip(textOnPage, {
      useImgAltText: false,
    });
  };
}

