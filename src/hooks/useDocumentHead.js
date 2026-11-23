import { useEffect } from 'react';
import { buildHead, jsonLdScript } from '../seo/meta.js';

export function useDocumentHead(page) {
  useEffect(() => {
    if (!page) return;

    const siteUrl = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/+$/, '');
    const head = buildHead(page, siteUrl);

    // 1. Document title
    if (head.title) {
      document.title = head.title;
    }

    // Helper to update or create meta tag
    const setMeta = (attr, key, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Helper to update or create link tag
    const setLink = (rel, href) => {
      if (!href) return;
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    // 2. Standard Meta & Canonical
    setMeta('name', 'description', head.description);
    setMeta('name', 'robots', head.robots);
    setLink('canonical', head.canonical);

    // 3. Open Graph
    if (head.og) {
      setMeta('property', 'og:site_name', head.og.site_name);
      setMeta('property', 'og:type', head.og.type);
      setMeta('property', 'og:title', head.og.title);
      setMeta('property', 'og:description', head.og.description);
      setMeta('property', 'og:url', head.og.url);
      setMeta('property', 'og:image', head.og.image);
      setMeta('property', 'og:image:width', String(head.og.imageWidth || 1200));
      setMeta('property', 'og:image:height', String(head.og.imageHeight || 675));
      setMeta('property', 'og:image:alt', head.og.imageAlt || head.og.title);
    }

    // 4. Twitter
    setMeta('name', 'twitter:card', 'summary_large_image');

    // 5. JSON-LD scripts
    const existingJsonLd = document.querySelectorAll('script[type="application/ld+json"][data-dynamic="true"]');
    existingJsonLd.forEach((el) => el.remove());

    if (Array.isArray(head.jsonLd)) {
      head.jsonLd.forEach((item) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-dynamic', 'true');
        script.textContent = jsonLdScript(item);
        document.head.appendChild(script);
      });
    }
  }, [page]);
}

export default useDocumentHead;
