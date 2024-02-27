import { getArticles } from "@lib/collections/articles";
import type { APIRoute } from "astro";
import { getImage } from "astro:assets";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";
import path from "path";
import { marked } from 'marked';
import fs from "fs/promises"

export const GET: APIRoute = async ({ params, url }) => {
  const articleSlug = params.article;

  const articles = await getArticles();

  const article = articles.find((article) => article.slug === articleSlug);

  if (!article) {
    return new Response("Article not found", { status: 404 });
  }

  let coverImage;

  if (article.data.coverImage) {
    const width = url.searchParams.get("coverImageWidth");
    const height = url.searchParams.get("coverImageHeight");

    coverImage = await getImage({
      src: article.data.coverImage,
      width,
      height,
    });
  }

  console.debug(article);

  console.debug(process.cwd());

  const markdown = fromMarkdown(article.body);

  for (const childNode of markdown.children) {
    if (childNode.type === "paragraph") {
      const images = childNode.children.filter((c) => c.type === "image") as {
        url: string;
        alt: string;
      }[];

      for (const image of images) {
        const imagePath = `${import.meta.env.PROD ? '../../../../' : '/'}src/content/articles/${
          article.slug
        }/${path.basename(image.url)}`;
        const imageImport = await import(/* @vite-ignore */ imagePath);

        console.debug(imageImport);

        const renderedImage = await getImage({
          src: imageImport.default,
        });

        image.url = renderedImage.src;
      }
    }
  }

  article.body = toMarkdown(markdown);

  return new Response(
    JSON.stringify({ body: article.body, data: article.data, coverImage }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
