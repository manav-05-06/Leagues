import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEAGUE_SEO_DATA,
  toUrlName,
  fromUrlName,
} from './leagues.js';
import { slugify } from '../routes.js';

test('slugify handles accents, & symbol, empty results, and 80 character cuts', () => {
  assert.equal(slugify('Atlético Madrid'), 'atletico-madrid');
  assert.equal(slugify('Brighton & Hove Albion'), 'brighton-hove-albion');
  assert.equal(slugify('Al Nassr'), 'al-nassr');
  assert.equal(slugify(''), '');
  assert.equal(slugify(null), '');
  assert.equal(slugify(undefined), '');
  assert.equal(slugify('---'), '');
  assert.equal(slugify('!@#$%^&*()'), '');

  // 80 char cut
  const longText = 'a'.repeat(100);
  assert.equal(slugify(longText).length, 80);
});

test('toUrlName and fromUrlName round-trip for all 19 leagues', () => {
  const espnSlugs = Object.keys(LEAGUE_SEO_DATA);
  assert.equal(espnSlugs.length, 19);

  for (const slug of espnSlugs) {
    const urlName = toUrlName(slug);
    assert.ok(urlName, `Url name for ${slug} must be defined`);
    assert.equal(typeof urlName, 'string');
    const recovered = fromUrlName(urlName);
    assert.equal(recovered, slug, `fromUrlName(${urlName}) must match ${slug}`);
  }

  // Unknown league returns null on fromUrlName
  assert.equal(fromUrlName('unknown-league'), null);
});
