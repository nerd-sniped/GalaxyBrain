// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import { graphBuilder } from './src/integrations/graph-builder.js';
import remarkObsidian from '@heavycircle/remark-obsidian';
import remarkWikilinks from './src/lib/remark-wikilinks.ts';
import rehypeRaw from 'rehype-raw';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: netlify(),
  integrations: [graphBuilder(), react()],
  markdown: {
    remarkPlugins: [
      remarkWikilinks,   // [[wikilinks]] → <a data-wikilink>
      remarkObsidian,    // callouts, ==highlights==, %%comments%%
    ],
    rehypePlugins: [
      rehypeRaw,         // allow the inline HTML nodes the plugins emit
    ],
  },
  vite: {
    ssr: {
      // react-force-graph-3d uses browser globals — exclude from SSR bundle
      noExternal: [],
    },
    optimizeDeps: {
      include: ['react-force-graph-3d', 'three'],
    },
  },
});
