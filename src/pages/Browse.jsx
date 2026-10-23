import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '../lib/store.jsx'
import { search, normalize, parseBoxNumber } from '../lib/search.js'
import { locationLabel, pathLabel, itemsWithin } from '../lib/tree.js'
import { Page, Empty, Fab } from '../components/ui.jsx'
import { LocationRow, List } from '../components/rows.jsx'

/** /emplacements : tout l'arbre des emplacements, avec recherche limitée aux emplacements. */
export function LocationsPage() {
  const { locations, items, index } = useData()
  const [q, setQ] = useQuery()

  const tree = useMemo(() => {
    const out = []
    const walk = (parentId, depth) => {
      for (const l of index.children.get(parentId) || []) {
        out.push({ loc: l, depth })
        walk(l.id, depth + 1)
      }
    }
    walk(null, 0)
    return out
  }, [index])

  const found = useMemo(() => (q.trim() ? search(q, items, locations, index).locations : null), [q, items, locations, index])

  return (
    <Page title="Emplacements" back="/">
      <SearchBox value={q} onChange={setQ} placeholder="Chercher un emplacement (bureau, étagère, 12…)" />
      {found ? (
        found.length ? (
          <List>
            {found.map((l) => (
              <LocationRow key={l.id} loc={l} showPath />
            ))}
          </List>
        ) : (
          <Empty icon="🤷" title={`Aucun emplacement pour « ${q} »`} />
        )
      ) : tree.length ? (
        <List>
          {tree.map(({ loc, depth }) => (
            <div key={loc.id} style={{ paddingLeft: depth * 16 }} className={depth ? 'bg-papier/40' : ''}>
              <LocationRow loc={loc} />
            </div>
          ))}
        </List>
      ) : (
        <Empty icon="🏠" title="Aucun emplacement pour l’instant" />
      )}
      <Fab to="/l/nouveau" label="Emplacement" />
    </Page>
  )
}

/** /boites : toutes les boîtes de la maison, cherchables par numéro, nom, endroit ou contenu. */
export function BoxesPage() {
  const { locations, index } = useData()
  const [q, setQ] = useQuery()

  const boxes = useMemo(
    () => locations.filter((l) => l.kind === 'boite').sort((a, b) => (a.number ?? 0) - (b.number ?? 0)),
    [locations],
  )

  const shown = useMemo(() => {
    if (!q.trim()) return boxes
    const num = parseBoxNumber(q)
    if (num != null) return boxes.filter((b) => b.number === num)
    const nq = normalize(q)
    return boxes.filter((b) => {
      const hay = [locationLabel(b), pathLabel(index, b.parent_id), b.notes, ...itemsWithin(index, b.id).map((i) => i.name)]
      return hay.some((s) => normalize(s).includes(nq))
    })
  }, [q, boxes, index])

  return (
    <Page title={`Boîtes (${boxes.length})`} back="/">
      <SearchBox value={q} onChange={setQ} placeholder="N° de boîte, nom, pièce ou contenu" />
      {shown.length ? (
        <List>
          {shown.map((b) => (
            <LocationRow key={b.id} loc={b} showPath />
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
