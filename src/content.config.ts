import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { partIds } from './data/parts';

const chapters = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/chapters' }),
  schema: z.object({
    title: z.string(),
    deck: z.string(),
    part: z.enum(partIds),
    order: z.number().int().positive(),
    stub: z.boolean().default(false),
  }),
});

export const collections = { chapters };
