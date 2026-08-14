import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    order: z.number(),
  }),
});

const changelog = defineCollection({
  // Default id generation (github-slugger) strips periods, which collides
  // version numbers like 0.11.0 and 0.1.10 into the same id ("0110"). Use
  // the raw filename instead so every version stays unique.
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/changelog',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    version: z.string(),
    tag: z.string(),
    name: z.string(),
    date: z.coerce.date(),
    url: z.string(),
  }),
});

export const collections = { docs, changelog };
