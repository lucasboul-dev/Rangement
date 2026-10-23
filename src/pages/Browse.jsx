import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useData } from '../lib/store.jsx'
import { search, normalize } from '../lib/search.js'
import { locationLabel, pathLabel, itemsWithin, KINDS } from '../lib/tree.js'
import { Page, Empty, Fab, Thumb } from '../components/ui.jsx'
import { LocationRow, List, ContentsPreview } from '../components/rows.jsx'

const OPEN_KEY = 'rangement.emplacements.ouverts'

function loadOpen() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(OPEN_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

/**
 * /emplacements : seulement les lieux du premier niveau ; un tap déroule ce qu'il y a dedans
 * (meubles, ou directement les boîtes), et ainsi de suite. Recherche limitée aux emplacements.
 */
export function LocationsPage() {
  const { locations, items, index } = useData()
  const [q, setQ] = useQuery()
  const [open, setOpen] = useState(loadOpen)

  const toggle = (id) =>
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      try {
        sessionStorage.setItem(OPEN_KEY, JSON.stringify([...next]))
      } catch {
        /* stockage indisponible */
      }
      return next
    })

  const found = useMemo(() => (q.trim() ? search(q, items, locations, index).locations : null), [q, items, locations, index])
  const roots = index.children.get(null) || []

  return (
    <Page title="Emplacements" back="/">
      <SearchBox value={q} onChange={setQ} placeholder="Chercher un emplacement (bureau, étagère…)" />
      {found ? (
        found.length ? (
          <List>
            {found.map((l) => (
              <LocationRow key={l.id} loc={l} showPath query={q} />
            ))}
          </List>
        ) : (
          <Empty icon="🤷" title={`Aucun emplacement pour « ${q} »`} />
        )
      ) : roots.length ? (
        <List>
          {roots.map((l) => (
            <TreeNode key={l.id} loc={l} depth={0} open={open} toggle={toggle} />
          ))}
        </List>
      ) : (
        <Empty icon="🏠" title="Aucun emplacement pour l’instant" />
      )}
      <Fab to="/l/nouveau" label="Emplacement" />
    </Page>
  )
}

function TreeNode({ loc, depth, open, toggle }) {
  const { index } = useData()
  const children = index.children.get(loc.id) || []
  const expandable = children.length > 0
  const isOpen = expandable && open.has(loc.id)
  const indent = { paddingLeft: 12 + depth * 18 }

  const body = (
    <>
      <span className="w-4 shrink-0 text-gris text-sm">{expandable ? (isOpen ? '▾' : '▸') : ''}</span>
      <Thumb path={loc.photo_path} fallback={KINDS[loc.kind]?.icon} size="size-11" />
      <div className="flex-1 min-w-0 text-left">
        <p className="font-medium truncate">{locationLabel(loc)}</p>
        {!isOpen && <ContentsPreview loc={loc} />}
      </div>
    </>
  )

  return (
    <>
      <div className={`flex items-center ${depth ? 'bg-papier/40' : ''}`}>
        {expandable ? (
          <button type="button" onClick={() => toggle(loc.id)} aria-expanded={isOpen} className="flex-1 min-w-0 flex items-center gap-2.5 py-2.5 active:bg-carton-clair/50" style={indent}>
            {body}
          </button>
        ) : (
          <Link to={`/l/${loc.id}`} className="flex-1 min-w-0 flex items-center gap-2.5 py-2.5 active:bg-carton-clair/50" style={indent}>
            {body}
          </Link>
        )}
        <Link to={`/l/${loc.id}`} className="shrink-0 h-14 w-11 grid place-items-center text-gris text-lg active:bg-carton-clair/50" aria-label={`Ouvrir ${locationLabel(loc)}`}>
          ›
        </Link>
      </div>
      {isOpen && children.map((c) => <TreeNode key={c.id} loc={c} depth={depth + 1} open={open} toggle={toggle} />)}
    </>
  )
}

/** /boites : toutes les boîtes de la maison, cherchables par nom, endroit ou contenu. */
export function BoxesPage() {
  const { locations, index } = useData()
  const [q, setQ] = useQuery()

  const boxes = useMemo(
    () => locations.filter((l) => l.kind === 'boite').sort((a, b) => locationLabel(a).localeCompare(locationLabel(b), 'fr', { numeric: true })),
    [locations],
  )

  const shown = useMemo(() => {
    if (!q.trim()) return boxes
    const nq = normalize(q)
    return boxes.filter((b) => {
      const hay = [locationLabel(b), pathLabel(index, b.parent_id), b.notes, ...itemsWithin(index, b.id).map((i) => i.name)]
      return hay.some((s) => normalize(s).includes(nq))
    })
  }, [q, boxes, index])

  return (
    <Page title={`Boîtes (${boxes.length})`} back="/">
      <SearchBox value={q} onChange={setQ} placeholder="Nom de boîte, pièce ou contenu" />
      {shown.length ? (
        <List>
          {shown.map((b) => (
            <LocationRow key={b.id} loc={b} showPath query={q} />
          ))}
        </List>
      ) : boxes.length ? (
        <Empty icon="🤷" title={`Aucune boîte pour « ${q} »`} />
      ) : (
        <Empty icon="📦" title="Aucune boîte pour l’instant" />
      )}
      <Fab to="/l/nouveau?type=boite" label="Boîte" />
    </Page>
  )
}

function useQuery() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  return [q, (v) => setParams(v ? { q: v } : {}, { replace: true })]
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="sticky top-14 z-10 -mx-4 px-4 pb-3 pt-1 bg-papier">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gris">🔍</span>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-12 rounded-2xl bg-white border border-trait pl-10 pr-10 outline-none focus:border-kraft focus:ring-2 focus:ring-carton-clair shadow-sm"
          enterKeyHint="search"
        />
        {value && (
          <button onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-full text-gris" aria-label="Effacer">
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
