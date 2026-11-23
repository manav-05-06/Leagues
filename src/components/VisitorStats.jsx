import { Analytics } from '@vercel/analytics/react';
import { matchPath, useLocation } from 'react-router-dom';

// Page types, in the same shape as the routes in App.jsx. Vercel's dashboard
// groups visits by these, e.g. every match page counts under /match/:id/:slug.
const ROUTE_PATTERNS = [
  '/',
  '/league/:leagueName',
  '/league/:leagueName/table',
  '/match/:id',
  '/match/:id/:slug',
  '/team/:id',
  '/team/:id/:slug',
  '/tactics',
  '/replay',
  '/about',
];

function routeFor(pathname) {
  return ROUTE_PATTERNS.find((pattern) => matchPath(pattern, pathname)) || '/not-found';
}

// Drop the query string and #hash from every event before it leaves the
// browser, so shared tactics boards (#tactics=...) and ?date= stay private.
function stripUrl(event) {
  try {
    const url = new URL(event.url);
    url.search = '';
    url.hash = '';
    return { ...event, url: url.toString() };
  } catch {
    return event;
  }
}

// Cookie-free page-view counting with Vercel Web Analytics.
export default function VisitorStats() {
  const { pathname } = useLocation();
  return <Analytics route={routeFor(pathname)} path={pathname} beforeSend={stripUrl} />;
}
