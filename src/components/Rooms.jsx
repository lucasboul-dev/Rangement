import { useMemo, useState } from 'react'
import { useData } from '../lib/store.jsx'
import { ROOM_SUGGESTIONS, defaultRoomParent, locationLabel, roomsOf, countItemsDeep, KINDS } from '../lib/tree.js'
import { normalize } from '../lib/search.js'
import { errorMessage } from '../lib/supabase.js'
import { Button, ErrorNote, inputClass } from './ui.jsx'

/** Création rapide d'une pièce, avec suggestions (Cuisine, Garage…). */
export function NewRoomForm({ onCreated, onCancel, autoFocus = true }) {
  const { locations, index, createLocation } = useData()
  const [name, setName] = useState('')
  const lieux = useMemo(() => (index.children.get(null) || []).filter((l) => l.kind === 'lieu'), [index])
  const [parentId, setParentId] = useState(() => defaultRoomParent(index))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const existing = useMemo(() => new Set(locations.map((l) => normalize(l.name))), [locations])
  const suggestions = ROOM_SUGGESTIONS.filter((s) => !existing.has(normalize(s)))
    .filter((s) => !name || normalize(s).startsWith(normalize(name)))

  async function create(value = name) {
    const n = value.trim()
    if (!n) return setError('Donne un nom à la pièce.')
    setBusy(true)
    setError('')
    try {
      const room = await createLocation({ kind: 'piece', name: n, parent_id: parentId })
      onCreated(room)
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        create()
      }}
      className="space-y-3"
    >
      <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de la pièce (ex. Garage)" autoFocus={autoFocus} />
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button type="button" key={s} disabled={busy} onClick={() => create(s)} className="text-sm rounded-full border border-trait bg-white px-3 py-1.5 active:bg-carton-clair">
              + {s}
            </button>
          ))}
        </div>
      )}
      {lieux.length > 0 && (
        <label className="flex items-center gap-2 text-sm text-gris">
          Dans
          <select className="flex-1 rounded-xl border border-trait bg-white px-2 h-10 text-encre" value={parentId || ''} onChange={(e) => setParentId(e.target.value || null)}>
            {lieux.map((l) => (
              <option key={l.id} value={l.id}>
                {locationLabel(l)}
              </option>
            ))}
            <option value="">Nulle part (tout en haut)</option>
          </select>
        </label>
      )}
      <ErrorNote error={error} />
      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button className="flex-1" disabled={busy || !name.trim()}>
          {busy ? 'Création…' : 'Créer la pièce'}
        </Button>
      </div>
    </form>
  )
}

/** Rangée de pièces cliquables. */
export function RoomChips({ selectedId, onSelect, onAdd, disabled, counts = false, wrap = false }) {
  const { locations, index } = useData()
  const rooms = roomsOf(index, locations).filter((r) => !disabled?.(r))
  return (
    <div className={wrap ? 'flex flex-wrap gap-2' : '-mx-4 px-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]'}>
      {rooms.map((r) => {
        const active = r.id === selectedId
        const n = counts ? countItemsDeep(index, r.id) : null
        return (
          <button
            type="button"
            key={r.id}
            onClick={() => onSelect(r)}
            className={`shrink-0 h-10 rounded-full px-3.5 text-sm font-medium border flex items-center gap-1.5 ${
              active ? 'bg-kraft text-white border-kraft' : 'bg-white border-trait active:bg-carton-clair'
            }`}
          >
            <span>{KINDS[r.kind]?.icon}</span>
            {locationLabel(r)}
            {n != null && <span className={`text-xs ${active ? 'text-white/80' : 'text-gris'}`}>{n}</span>}
          </button>
        )
      })}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 h-10 rounded-full px-3.5 text-sm font-medium border-2 border-dashed border-carton text-kraft active:bg-carton-clair"
        >
          + Pièce
        </button>
      )}
    </div>
  )
}
