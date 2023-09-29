import { getCollection } from "astro:content"

export const getArticles = async () => {
    return await getCollection('articles');
}

export const getArticlesWithTodos = async () => {
    return (await getArticles()).filter((article) => article.data.todo);
}

export const getArticlesWithOk = async () => {
    return (await getArticles()).filter((article) => article.data.ok);
}

export const getArticlesWithoutOk = async () => {
    return (await getArticles()).filter((article) => !article.data.ok);
}