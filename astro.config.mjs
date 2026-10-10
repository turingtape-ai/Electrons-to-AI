// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// GitHub Pages serves project sites under /<repo-name>/. The deploy workflow
// sets SITE_URL and SITE_BASE from the repository; local builds fall back to
// the known values so `npm run build` produces the same links either way.
const site = process.env.SITE_URL ?? 'https://turingtape-ai.github.io';
const base = process.env.SITE_BASE ?? '/Electrons-to-AI';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  integrations: [mdx()],
});
