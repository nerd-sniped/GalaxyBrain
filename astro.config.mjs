// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import { assetCollector } from './src/integrations/asset-collector.ts';
import { graphBuilder } from './src/integrations/graph-builder.js';
import { blockIndexer } from './src/integrations/block-indexer.ts';
import remarkObsidian from '@heavycircle/remark-obsidian';
import remarkWikilinks from './src/lib/remark-wikilinks.ts';
import remarkVaultImages from './src/plugins/remark-vault-images.ts';
import remarkTransclusion from './src/plugins/remark-transclusion.ts';
import rehypeRaw from 'rehype-raw';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: netlify(),
  integrations: [
    assetCollector(),  // astro:build:start — copy vault images → public/vault-assets/
    graphBuilder(),    // astro:config:done — build graph JSON
    blockIndexer(),    // astro:build:start — index block IDs for transclusion
    react(),
  ],
  markdown: {
    remarkPlugins: [
      remarkVaultImages,   // ![[img.ext]] → <img src="/vault-assets/...">
      remarkTransclusion,  // ![[note#^id]] / ![[note]] → blockquote/details embeds
      remarkWikilinks,     // [[wikilinks]] → <a data-wikilink>
      remarkObsidian,      // callouts, ==highlights==, %%comments%%
    ],
    rehypePlugins: [
      rehypeRaw,           // allow the inline HTML nodes the plugins emit
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
