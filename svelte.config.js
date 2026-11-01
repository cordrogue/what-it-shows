import adapter from '@sveltejs/adapter-static';
import { mdsvex } from 'mdsvex';
import { fileURLToPath } from 'node:url';

const runbook = fileURLToPath(new URL('./src/lib/layouts/runbook.svelte', import.meta.url));

/** @type {import('@sveltejs/kit').Config} */
export default {
  extensions: ['.svelte', '.svx'],
  preprocess: [
    mdsvex({
      extensions: ['.svx'],
      layout: { runbook },
    }),
  ],
  kit: {
    adapter: adapter({ pages: 'build', assets: 'build', strict: true }),
    alias: { '#lib': 'src/lib' },
    prerender: { entries: ['/kb', '/kb/incidents/4471', '/kb/incidents/4471-split', '/kb/triage/dedupe', '/kb/decisions/0001-dedupe-by-subject'] },
  },
};
