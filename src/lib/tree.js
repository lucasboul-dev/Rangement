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

// ---------- Pièces de vie ----------

export const ROOM_SUGGESTIONS = [
  'Cuisine', 'Salon', 'Chambre', 'Salle de bain', 'Garage', 'Grenier', 'Cave', 'Bureau',
  'Entrée', 'Buanderie', 'Salle à manger', 'Chambre d’amis', 'Cellier', 'Abri de jardin',
]

/**
 * Les « pièces » proposées en raccourci : toutes les pièces, plus les lieux qui ne
 * contiennent pas eux-mêmes de pièces (ex. Garage oui, Maison non si elle contient Cuisine…).
 */
export function roomsOf(index, locations) {
  return locations
    .filter((l) => {
      if (l.kind === 'piece') return true
      if (l.kind !== 'lieu') return false
      return !(index.children.get(l.id) || []).some((c) => c.kind === 'piece')
    })
    .sort((a, b) => locationLabel(a).localeCompare(locationLabel(b), 'fr'))
}

/** Où créer une nouvelle pièce : dans le lieu (en haut) qui contient déjà le plus de pièces, sinon tout en haut. */
export function defaultRoomParent(index) {
  let best = null
  let bestCount = 0
  for (const l of index.children.get(null) || []) {
    if (l.kind !== 'lieu') continue
    const n = (index.children.get(l.id) || []).filter((c) => c.kind === 'piece').length
    if (n > bestCount) {
      best = l.id
      bestCount = n
    }
  }
  return best
}

/** L'emplacement et tous ses descendants. */
export function scopeIds(index, id) {
  const s = descendantIds(index, id)
  s.add(id)
  return s
}

/** Les boîtes contenues dans un emplacement (à tous les niveaux), par numéro. */
export function boxesWithin(index, id) {
  return [...descendantIds(index, id)]
    .map((d) => index.byId.get(d))
    .filter((l) => l?.kind === 'boite')
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
}

/** Les objets contenus dans un emplacement (à tous les niveaux). */
export function itemsWithin(index, id) {
  const out = [...(index.itemsByLoc.get(id) || [])]
  for (const d of descendantIds(index, id)) out.push(...(index.itemsByLoc.get(d) || []))
  return out.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

/** Chemin à partir d'un ancêtre (exclu) : « Étagère 2 › Boîte 12 ». */
export function pathFrom(index, ancestorId, id) {
  const p = pathOf(index, id)
  const i = p.findIndex((l) => l.id === ancestorId)
  const rest = i === -1 ? p : p.slice(i + 1)
  return rest.map(locationLabel).join(' › ')
}

/** Nombre d'objets (en tenant compte des quantités ? non : nombre de fiches) dans l'emplacement et ses descendants. */
export function countItemsDeep(index, id) {
  let n = (index.itemsByLoc.get(id) || []).length
  for (const d of descendantIds(index, id)) n += (index.itemsByLoc.get(d) || []).length
  return n
}
