import { z, defineCollection } from 'astro:content';

const articlesCollection = defineCollection({
  schema: ({ image }) => z.object({
    title: z.string(),
    id: z.number().or(z.string()).optional(),
    tags: z.array(z.string()).or(z.string()).optional().nullable(),
    date: z.date(),
    coverImage: image().optional(),
    todo: z.array(z.string()).or(z.string()).optional().nullable(),
    author: z.string().optional()
  })
});

export const collections = {
  'articles': articlesCollection,
};