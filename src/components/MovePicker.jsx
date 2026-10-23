import { useMemo, useState } from 'react'
import { useData } from '../lib/store.jsx'
import { canMoveLocation, locationLabel, pathLabel, KINDS } from '../lib/tree.js'
import { normalize } from '../lib/search.js'
import { Sheet, inputClass } from './ui.jsx'
import { NewRoomForm, RoomChips } from './Rooms.jsx'

/**
 * Choisir un emplacement de destination.
 * - movingLocationId : si on déplace un emplacement, on masque lui-même et ses descendants
 * - allowRoot : propose « À la racine / Non rangé »
 */
export function MovePicker({ open, onClose, onPick, title = 'Ranger dans…', movingLocationId, allowRoot = true, rootLabel = 'Nulle part (racine)', currentId, showRooms = true }) {
  const { locations, index } = useData()
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)

  const rows = useMemo(() => {
    const out = []
    const walk = (parentId, depth) => {
      for (const l of index.children.get(parentId) || []) {
        if (movingLocationId && !canMoveLocation(index, movingLocationId, l.id)) continue
        out.push({ loc: l, depth })
        walk(l.id, depth + 1)
      }
    }
    walk(null, 0)
    return out
  }, [index, movingLocationId, locations])

  const nq = normalize(q)
  const filtered = nq
    ? rows.filter(({ loc }) => normalize(pathLabel(index, loc.id)).includes(nq)).map((r) => ({ ...r, depth: 0, showPath: true }))
    : rows

  const close = () => {
    setCreating(false)
    setQ('')
    onClose()
  }
  const pick = (id) => {
    setCreating(false)
    setQ('')
    onPick(id)
  }

  return (
    <Sheet open={open} onClose={close} title={title}>
      {showRooms && !nq && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gris px-1">Pièces</p>
          {creating ? (
            <div className="rounded-2xl bg-white border border-trait p-3">
              <NewRoomForm onCreated={(room) => pick(room.id)} onCancel={() => setCreating(false)} />
            </div>
          ) : (
            <RoomChips
                wrap
              selectedId={currentId}
              onSelect={(r) => pick(r.id)}
              onAdd={() => setCreating(true)}
              disabled={(r) => movingLocationId && !canMoveLocation(index, movingLocationId, r.id)}
            />
          )}
          {!creating && <p className="text-xs font-semibold uppercase tracking-wider text-gris px-1 pt-2">Ou plus précisément</p>}
        </div>
      )}
      <input className={`${inputClass} mb-3`} placeholder="Filtrer (ex. grenier, 12…)" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="rounded-2xl bg-white border border-trait divide-y divide-trait overflow-hidden">
        {allowRoot && !nq && (
          <button className="w-full text-left px-3 py-3 active:bg-carton-clair/50 text-gris" onClick={() => pick(null)}>
            {rootLabel}
          </button>
        )}
        {filtered.map(({ loc, depth, showPath }) => (
          <button
            key={loc.id}
            onClick={() => pick(loc.id)}
            disabled={loc.id === currentId}
            className="w-full text-left py-2.5 pr-3 flex items-center gap-2 active:bg-carton-clair/50 disabled:opacity-40"
            style={{ paddingLeft: 12 + depth * 18 }}
          >
            <span>{KINDS[loc.kind]?.icon}</span>
            <span className="flex-1 min-w-0">
              <span className="block truncate">{locationLabel(loc)}</span>
              {showPath && loc.parent_id && <span className="block text-xs text-gris truncate">{pathLabel(index, loc.parent_id)}</span>}
            </span>
            {loc.id === currentId && <span className="text-xs text-gris">actuel</span>}
          </button>
        ))}
        {filtered.length === 0 && <p className="px-3 py-4 text-sm text-gris">Aucun emplacement.</p>}
      </div>
    </Sheet>
  )
}
