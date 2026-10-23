// Fonctions pures sur l'arborescence des emplacements.

export const KINDS = {
  lieu: { label: 'Lieu', hint: 'Maison, garage, cave…', icon: '🏠' },
  piece: { label: 'Pièce', hint: 'Cuisine, grenier, chambre…', icon: '🚪' },
  meuble: { label: 'Meuble / étagère', hint: 'Armoire, étagère, congélateur…', icon: '🗄️' },
  boite: { label: 'Boîte', hint: 'Carton, bac, valise…', icon: '📦' },
}

export function locationLabel(loc) {
  if (!loc) return 'Non rangé'
  if (loc.kind === 'boite') {
    const num = loc.number != null ? `Boîte ${loc.number}` : 'Boîte'
    return loc.name ? `${num} · ${loc.name}` : num
  }
  return loc.name || KINDS[loc.kind]?.label || 'Sans nom'
}

export function boxCode(loc) {
  return loc?.number != null ? `B-${String(loc.number).padStart(3, '0')}` : ''
}

/** Construit un index rapide : par id, enfants par parent, objets par emplacement. */
export function buildIndex(locations, items) {
  const byId = new Map()
  const children = new Map()
  const itemsByLoc = new Map()
  for (const l of locations) byId.set(l.id, l)
  for (const l of locations) {
    const key = l.parent_id && byId.has(l.parent_id) ? l.parent_id : null
    if (!children.has(key)) children.set(key, [])
    children.get(key).push(l)
  }
  for (const list of children.values()) list.sort(compareLocations)
  for (const it of items) {
    const key = it.location_id && byId.has(it.location_id) ? it.location_id : null
    if (!itemsByLoc.has(key)) itemsByLoc.set(key, [])
    itemsByLoc.get(key).push(it)
  }
  for (const list of itemsByLoc.values()) list.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  return { byId, children, itemsByLoc }
}

const KIND_ORDER = { lieu: 0, piece: 1, meuble: 2, boite: 3 }

export function compareLocations(a, b) {
  const k = (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9)
  if (k) return k
  if (a.kind === 'boite' && b.kind === 'boite') return (a.number ?? 0) - (b.number ?? 0)
  return locationLabel(a).localeCompare(locationLabel(b), 'fr')
}

/** Chemin de la racine jusqu'à l'emplacement (inclus). */
export function pathOf(index, id) {
  const path = []
  const seen = new Set()
  let cur = id ? index.byId.get(id) : null
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    path.unshift(cur)
    cur = cur.parent_id ? index.byId.get(cur.parent_id) : null
  }
  return path
}

export function pathLabel(index, id) {
  const p = pathOf(index, id)
  return p.length ? p.map(locationLabel).join(' › ') : 'Non rangé'
}

/** Tous les descendants (ids) d'un emplacement, lui exclu. */
export function descendantIds(index, id) {
  const out = new Set()
  const stack = [...(index.children.get(id) || [])]
  while (stack.length) {
    const l = stack.pop()
    if (out.has(l.id)) continue
    out.add(l.id)
    stack.push(...(index.children.get(l.id) || []))
  }
  return out
}

/** Peut-on ranger l'emplacement `id` dans `targetId` (null = à la racine) ? */
export function canMoveLocation(index, id, targetId) {
  if (targetId == null) return true
  if (targetId === id) return false
  return !descendantIds(index, id).has(targetId)
}

/** Nombre d'objets (en tenant compte des quantités ? non : nombre de fiches) dans l'emplacement et ses descendants. */
export function countItemsDeep(index, id) {
  let n = (index.itemsByLoc.get(id) || []).length
  for (const d of descendantIds(index, id)) n += (index.itemsByLoc.get(d) || []).length
  return n
}
