import { Organization } from '../models/Organization';

function baseSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'org';
}

/**
 * Produces a unique organization slug, appending a numeric suffix on collision.
 */
export async function slugify(input: string): Promise<string> {
  const base = baseSlug(input);
  let candidate = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Organization.exists({ slug: candidate })) {
    candidate = `${base}-${n++}`;
  }
  return candidate;
}
