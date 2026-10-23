import { Link } from 'react-router-dom'
import { useData } from '../lib/store.jsx'
import { locationLabel, pathLabel, pathFrom, boxesWithin, itemsWithin, boxName, KINDS } from '../lib/tree.js'
import { Thumb } from './ui.jsx'

const MAX_PILLS = 6

/** Aperçu du contenu : les boîtes d'un meuble / d'une pièce, ou les objets d'une boîte. */
export function ContentsPreview({ loc }) {
  const { index } = useData()
  const boxes = loc.kind === 'boite' ? [] : boxesWithin(index, loc.id)
  if (boxes.length) {
    const shown = boxes.slice(0, MAX_PILLS)
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {shown.map((b) => (
          <span key={b.id} className="max-w-full truncate text-[11px] leading-5 rounded-md bg-carton-clair/70 text-kraft-fonce px-1.5">
            📦 {boxName(b)}
          </span>
        ))}
        {boxes.length > MAX_PILLS && <span className="text-[11px] leading-5 text-gris">+{boxes.length - MAX_PILLS}</span>}
      </div>
    )
  }
  const items = itemsWithin(index, loc.id)
  if (!items.length) return <p className="text-xs text-gris">vide</p>
  const names = items.slice(0, 5).map((i) => i.name).join(', ')
  return (
    <p className="text-xs text-gris line-clamp-2">
      {names}
      {items.length > 5 ? '…' : ''}
    </p>
  )
}

export function LocationRow({ loc, showPath = false }) {
  const { index } = useData()
  const parentPath = loc.parent_id ? pathLabel(index, loc.parent_id) : ''
  return (
    <Link to={`/l/${loc.id}`} className="flex items-center gap-3 px-3 py-2.5 active:bg-carton-clair/50">
      <Thumb path={loc.photo_path} fallback={KINDS[loc.kind]?.icon} />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {locationLabel(loc)}
          {loc.is_full && <span className="ml-2 align-middle text-[10px] font-semibold uppercase rounded bg-rouge/10 text-rouge px-1.5 py-0.5">pleine</span>}
        </p>
        {showPath && parentPath && <p className="text-xs text-gris truncate">{parentPath}</p>}
        <ContentsPreview loc={loc} />
      </div>
      <span className="text-gris">›</span>
    </Link>
  )
}

export function ItemRow({ item, showPath = true, fromId }) {
  const { index } = useData()
  return (
    <Link to={`/o/${item.id}`} className="flex items-center gap-3 px-3 py-2.5 active:bg-carton-clair/50">
      <Thumb path={item.photo_path} fallback="🔹" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {item.name}
          {item.quantity !== 1 && <span className="text-gris font-normal"> × {item.quantity}</span>}
        </p>
        {showPath && (
          <p className="text-xs text-gris truncate">
            {fromId ? pathFrom(index, fromId, item.location_id) || 'directement dans la pièce' : pathLabel(index, item.location_id)}
          </p>
        )}
        {item.is_out && <p className="text-xs text-rouge font-medium">Sorti de sa place</p>}
      </div>
      <span className="text-gris">›</span>
    </Link>
  )
}

export function List({ children }) {
  return <div className="rounded-2xl bg-white border border-trait divide-y divide-trait overflow-hidden">{children}</div>
}
