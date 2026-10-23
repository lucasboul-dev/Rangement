import Fuse from 'fuse.js'
import { locationLabel, pathLabel } from './tree.js'

/** minuscules, sans accents, espaces normalisés */
export function normalize(s) {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const BOX_QUERY = /^(?:b|boite|bo|n°|no|#)?\s*-?\s*0*(\d{1,5})$/

/** "12", "b12", "B-012", "boîte 12" → 12 ; sinon null */
export function parseBoxNumber(query) {
  const m = normalize(query).match(BOX_QUERY)
  return m ? Number(m[1]) : null
}

/**
 * Recherche tolérante (fautes, accents) dans les objets et les emplacements.
 * Retourne { boxes, locations, items } — chaque entrée : { ...doc, path }
 */
export function search(query, items, locations, index) {
  const q = normalize(query)
  if (!q) return { locations: [], items: [] }

  const num = parseBoxNumber(query)
  const exactBox = num != null ? locations.filter((l) => l.kind === 'boite' && l.number === num) : []

  const itemDocs = items.map((it) => ({
    ref: it,
    name: normalize(it.name),
    tags: (it.tags || []).map(normalize).join(' '),
    notes: normalize(it.notes),
    where: normalize(pathLabel(index, it.location_id)),
  }))
  const locDocs = locations.map((l) => ({
    ref: l,
    name: normalize(locationLabel(l)),
    notes: normalize(l.notes),
  }))

  const opts = { includeScore: true, threshold: 0.34, ignoreLocation: true, minMatchCharLength: 2 }
  const itemFuse = new Fuse(itemDocs, {
    ...opts,
    keys: [
      { name: 'name', weight: 3 },
      { name: 'tags', weight: 2 },
      { name: 'notes', weight: 0.6 },
      { name: 'where', weight: 0.4 },
    ],
  })
  const locFuse = new Fuse(locDocs, {
    ...opts,
    keys: [
      { name: 'name', weight: 3 },
      { name: 'notes', weight: 0.6 },
    ],
  })

  const foundItems = itemFuse.search(q).map((r) => r.item.ref)
  const foundLocs = locFuse.search(q).map((r) => r.item.ref)

  // Si c'est un numéro de boîte, on met la boîte et son contenu en tête
  const boxIds = new Set(exactBox.map((b) => b.id))
  const locations_ = [...exactBox, ...foundLocs.filter((l) => !boxIds.has(l.id))]
  const items_ = num != null
    ? [...items.filter((it) => boxIds.has(it.location_id)), ...foundItems.filter((it) => !boxIds.has(it.location_id))]
    : foundItems

  return { locations: dedupe(locations_), items: dedupe(items_) }
}

function dedupe(list) {
  const seen = new Set()
  return list.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)))
}
