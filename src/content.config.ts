import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * "notes" collection — maps to vault/**\/*.md (excludes attachments/)
 *
 * Only files with `publish: true` in frontmatter will be rendered.
 * The graph-builder integration also respects this field.
 */
const notes = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!attachments/**'], base: './vault' }),
  schema: z.object({
    publish: z.boolean().optional().default(false),
    title: z.string().optional(),
    tags: z.array(z.string()).nullish().transform(val => val ?? []),
    aliases: z.array(z.string()).nullish().transform(val => val ?? []),
    graph: z
      .object({
        shape: z
          .enum(['sphere', 'box', 'cone', 'cylinder', 'dodecahedron', 'torus', 'torusknot', 'octahedron'])
          .optional()
          .default('sphere'),
        color: z.string().optional(),
        collapsible: z.boolean().optional().default(false),
      })
      .optional(),
    cover: z.string().optional(),
  }),
});

export const collections = { notes };
