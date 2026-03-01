// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import { graphBuilder } from './src/integrations/graph-builder.js';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: netlify(),
  integrations: [graphBuilder(), react()],
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
