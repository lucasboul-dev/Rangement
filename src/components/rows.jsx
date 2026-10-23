import { Link } from 'react-router-dom'
import { useData } from '../lib/store.jsx'
import { countItemsDeep, locationLabel, pathLabel, pathFrom, KINDS } from '../lib/tree.js'
import { Thumb } from './ui.jsx'

export function LocationRow({ loc, showPath = false }) {
  const { index } = useData()
  const count = countItemsDeep(index, loc.id)
  const sub = (index.children.get(loc.id) || []).length
  const parentPath = loc.parent_id ? pathLabel(index, loc.parent_id) : ''
  const detail = [
    count ? `${count} objet${count > 1 ? 's' : ''}` : 'vide',
    sub ? `${sub} emplacement${sub > 1 ? 's' : ''}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <Link to={`/l/${loc.id}`} className="flex items-center gap-3 px-3 py-2.5 active:bg-carton-clair/50">
      <Thumb path={loc.photo_path} fallback={KINDS[loc.kind]?.icon} />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {locationLabel(loc)}
          {loc.is_full && <span className="ml-2 align-middle text-[10px] font-semibold uppercase rounded bg-rouge/10 text-rouge px-1.5 py-0.5">pleine</span>}
        </p>
        <p className="text-xs text-gris truncate">{showPath && parentPath ? parentPath : detail}</p>
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
