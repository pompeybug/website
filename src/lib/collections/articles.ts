import { getCollection, type CollectionEntry } from "astro:content";

export const sort = (
  articles: CollectionEntry<"articles">[],
  sort: "asc" | "desc" = "desc"
): CollectionEntry<"articles">[] => {
  if (sort === "asc") {
    return articles.sort(
      (a, b) => a.data.date.getTime() - b.data.date.getTime()
    );
  } else {
    return articles
      .sort((a, b) => a.data.date.getTime() - b.data.date.getTime())
      .reverse();
  }
};

export const getArticles = async (): Promise<CollectionEntry<"articles">[]> => {
  return await getCollection("articles");
};

export const getArticlesWithTodos = async (): Promise<
  CollectionEntry<"articles">[]
> => {
  return await getCollection("articles", ({ data }) => data.todo.length > 0);
};

export const getArticlesWithOk = async (): Promise<
  CollectionEntry<"articles">[]
> => {
  return await getCollection("articles", ({ data }) => data.ok);
};

export const getArticlesWithoutOk = async (): Promise<
  CollectionEntry<"articles">[]
> => {
  return await getCollection("articles", ({ data }) => !data.ok);
};

export const getAllUniqueArticleTags = async () => {
  const articles = await getArticles();

  const tags = articles
    .flatMap((article) => article.data.tags)
    .map((tag) => tag.toLowerCase());

  return [...new Set(tags)];
};

export const getAllArticlesWithTag = async (
  tag: string
): Promise<CollectionEntry<"articles">[]> => {
  return await getCollection("articles", ({ data }) =>
    data.tags.map((tag) => tag.toLowerCase()).includes(tag.toLowerCase())
  );
};
