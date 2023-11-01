import { z, defineCollection } from 'astro:content';

const toArray = (val: string | string[] | null | undefined) => {
  if (!val) {
    return [];
  }

  return Array.isArray(val) ? val : [val];
}

const articlesCollection = defineCollection({
  schema: ({ image }) => z.object({
    title: z.string(),
    id: z.number().or(z.string()).optional(),
    tags: z.union([z.array(z.string()), z.string()]).optional().nullable().transform((val) => toArray(val)),
    date: z.coerce.date(),
    coverImage: image().optional(),
    todo: z.union([z.array(z.string()), z.string()]).optional().nullable().transform((val) => toArray(val)),
    author: z.string().optional(),
    ok: z.union([z.string(), z.boolean()]).optional().transform((val) => typeof val === 'string' ? val === 'true' : Boolean(val)),
  })
});

export const collections = {
  'articles': articlesCollection,
};