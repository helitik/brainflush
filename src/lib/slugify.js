/**
 * Slugify a tab name: strip emoji, normalize accents, lowercase, collapse non-alphanum to dashes.
 */
export function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining marks (accents)
    .replace(/\p{Extended_Pictographic}[\u{FE00}-\u{FE0F}\u{200D}]*/gu, '') // strip emoji + variation selectors
    .replace(/[\uFE0F\u200D]/g, '') // leftover variation selectors
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // non-alphanum runs → dash
    .replace(/^-+|-+$/g, '') // trim leading/trailing dashes
    || 'tab'
}

/**
 * Build a Map<tabId, slug> from sorted tabs, handling collisions with -2, -3 suffixes.
 */
export function tabsToSlugs(tabs) {
  const sorted = [...tabs].sort((a, b) => a.order - b.order)
  const slugMap = new Map()
  const seen = new Map() // slug → count

  for (const tab of sorted) {
    const base = slugify(tab.name)
    const count = (seen.get(base) || 0) + 1
    seen.set(base, count)
    slugMap.set(tab.id, count === 1 ? base : `${base}-${count}`)
  }

  return slugMap
}

/**
 * Find a tab ID by its slug. Returns null if not found.
 */
export function findTabBySlug(slug, tabs) {
  const slugMap = tabsToSlugs(tabs)
  for (const [tabId, tabSlug] of slugMap) {
    if (tabSlug === slug) return tabId
  }
  return null
}
