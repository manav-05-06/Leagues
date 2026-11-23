import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolveSiteUrl } from './src/seo/site.js'

// Fills __SITE_URL__ in index.html before Vite parses it. Uses SITE_URL or
// VITE_SITE_URL when set, otherwise Vercel's production domain, so the build
// never depends on a setting someone forgot to add.
function siteUrlPlugin(siteUrl) {
  return {
    name: 'site-url',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replaceAll('__SITE_URL__', siteUrl),
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }
  const siteUrl = resolveSiteUrl(env)

  return {
    plugins: [react(), siteUrlPlugin(siteUrl)],
    define: {
      // The app falls back to window.location.origin when this is empty.
      'import.meta.env.VITE_SITE_URL': JSON.stringify(env.VITE_SITE_URL || env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '')),
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
