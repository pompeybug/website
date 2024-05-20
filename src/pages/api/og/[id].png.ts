import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from "astro";
import { getCollection } from "astro:content";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

type Props = InferGetStaticPropsType<typeof getStaticPaths>;
const font = await fetch(
  "https://cdn.jsdelivr.net/fontsource/fonts/atkinson-hyperlegible@latest/latin-700-normal.woff"
);
const fontBuffer = await font.arrayBuffer();

export const GET: APIRoute<Props> = async ({ props }) => {
  const svg = await satori(
    {
      type: "div",
      props: {
        children: [
          {
            type: "svg",
            props: {
              xmlns: "http://www.w3.org/2000/svg",
              viewBox: "-5 -5 312 173",
              width: "450px",
              height: "249px",
              children: [
                {
                  type: "path",
                  props: {
                    fill: "none",
                    stroke: "#222",
                    strokeWidth: "10",
                    d: "M90 .4c-120-9.9-120 170 0 161 100-16 100-16 164-26s64-100 0-110-64-10-164-25z",
                  },
                },
                {
                  type: "path",
                  props: {
                    fill: "#222",
                    d: "M80 10.4c24.9 0 46.7 13 59.1 32.5-8.8-7.8-20.4-12.5-33.1-12.5-27.7 0-50 22.3-50 50 0 27.6 22.3 50 50 50 12.7 0 24.3-4.8 33.1-12.6-12.4 19.5-34.2 32.6-59.1 32.6-38.7 0-70-31.4-70-70 0-38.7 31.3-70 70-70z",
                  },
                },
                {
                  type: "path",
                  props: {
                    fill: "#222",
                    d: "M245 35.4c24.8 0 45 20.1 45 45 0 24.8-20.2 45-45 45-24.9 0-45-20.2-45-45 0-24.9 20.1-45 45-45zm0 8l-5.6 23.5-20.6-12.7 12.7 20.6-23.5 5.6 23.5 5.5-12.7 20.6 20.6-12.7 5.6 23.6 5.5-23.6 20.6 12.7-12.7-20.6 23.6-5.5-23.6-5.6 12.7-20.6-20.6 12.7-5.5-23.5z",
                  },
                },
              ],
            },
          },
          {
            type: "h1",
            props: {
              style: {
                fontSize:
                  props.article.data.title.length > 70 ? "60px" : "75px",
                textAlign: "center",
                color: "#222",
              },
              children: props.article.data.title,
            },
          },
        ],
        style: {
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#fa7f42",
          alignItems: "center",
          justifyContent: "center",
        },
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Atkinson Hyperlegible",
          data: fontBuffer,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );

  const resvg = new Resvg(svg);
  const response = resvg.render().asPng();

  return new Response(response, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
    },
  });
};

export const getStaticPaths = (async () => {
  const articles = await getCollection("articles");

  return articles
    .filter((article) => !article.data.coverImage)
    .map((article) => ({
      params: { id: article.slug },
      props: { article },
    }));
}) satisfies GetStaticPaths;
