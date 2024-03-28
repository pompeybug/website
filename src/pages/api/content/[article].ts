import { type APIRoute, type GetImageResult } from "astro";
import { getImage } from "astro:assets";
import { getEntry } from "astro:content";

export const GET: APIRoute = async ({ params, url }) => {
  const articleSlug = params.article;

  if (!articleSlug) {
    return new Response("Article slug missing", { status: 400 });
  }

  const article = await getEntry("articles", articleSlug);

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

  const originalFiles: Record<string, string> = {};

  if (article.data.images) {
    for (const image of article.data.images) {
      const renderedImage = (await getImage({
        src: image.image,
      })) as GetImageResult;

      originalFiles[renderedImage.src] = image.file;

      article.body = article.body.replace(`./${image.file}`, renderedImage.src);
    }
  }

  return new Response(
    JSON.stringify({
      body: article.body,
      data: article.data,
      slug: article.slug,
      coverImage,
      originalFiles,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
