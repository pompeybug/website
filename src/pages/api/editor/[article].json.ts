import { type APIRoute, type GetStaticPaths, type InferGetStaticPropsType } from "astro";
import { getImage } from "astro:assets";
import { getCollection } from "astro:content";

export const GET: APIRoute<InferGetStaticPropsType<typeof getStaticPaths>> = async ({ props }) => {
  const article = props;

  let coverImage;

  if (article.data.coverImage) {
    coverImage = await getImage({
      src: article.data.coverImage,
      height: 500,
    });
  }

  const originalFiles: Record<string, string> = {};

  // if (article.data.images) {
  //   for (const image of article.data.images) {
  //     const renderedImage = (await getImage({
  //       src: image.image,
  //     })) as GetImageResult;

  //     originalFiles[renderedImage.src] = image.file;

  //     article.body = article.body.replace(`./${image.file}`, renderedImage.src);
  //   }
  // }

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

export const getStaticPaths = (async () => {
  const articles = await getCollection("articles");

  return articles.map((article) => ({
    params: { article: article.slug },
    props: article,
  }));
}) satisfies GetStaticPaths;
