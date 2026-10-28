import { defineConfig } from 'astro/config';

// Deployed to GitHub Pages as a user site (giuskywalkerxyz.github.io → served at root).
// If you host it under a project repo instead (e.g. github.com/giuskywalkerxyz/blog),
// set `base: '/blog'` and change `site` accordingly.
export default defineConfig({
  site: 'https://giuskywalkerxyz.github.io',
  markdown: {
    shikiConfig: {
      theme: 'tokyo-night',
      wrap: true,
    },
  },
});
