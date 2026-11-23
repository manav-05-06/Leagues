import { resolveSiteUrl } from '../../src/seo/site.js';

export default function handler(req, res) {
  const isProd = process.env.VERCEL_ENV === 'production';
  const siteUrl = resolveSiteUrl();

  let content = '';
  if (isProd) {
    content = `User-agent: *\nDisallow: /api/\nSitemap: ${siteUrl}/sitemap.xml\n`;
  } else {
    content = `User-agent: *\nDisallow: /\n`;
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
  res.status(200).send(content);
}
