import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useData } from '../lib/store.jsx'
import { search } from '../lib/search.js'
import { supabase } from '../lib/supabase.js'
import { Page, Section, Empty, Sheet, Button } from '../components/ui.jsx'
import { ItemRow, LocationRow, List } from '../components/rows.jsx'

export default function Home() {
  const { locations, items, index } = useData()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const [addOpen, setAddOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const results = useMemo(() => (q.trim() ? search(q, items, locations, index) : null), [q, items, locations, index])
  const roots = index.children.get(null) || []
  const loose = index.itemsByLoc.get(null) || []

  const setQ = (v) => setParams(v ? { q: v } : {}, { replace: true })

  return (
    <Page
      title="Rangement"
      actions={
        <button onClick={() => setMenuOpen(true)} className="size-10 grid place-items-center rounded-full active:bg-carton-clair text-xl" aria-label="Menu">
          ⋯
        </button>
      }
    >
      <div className="sticky top-14 z-10 -mx-4 px-4 pb-3 pt-1 bg-papier">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gris">🔍</span>
          <input
            type="search"
            role="searchbox"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Où est… ? (objet, tag, n° de boîte)"
            className="w-full h-12 rounded-2xl bg-white border border-trait pl-10 pr-10 outline-none focus:border-kraft focus:ring-2 focus:ring-carton-clair shadow-sm"
            enterKeyHint="search"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-full text-gris" aria-label="Effacer">
              ✕
            </button>
          )}
        </div>
      </div>

      {results ? (
        <SearchResults results={results} q={q} />
      ) : (
        <div className="space-y-6">
          <Stats />
          {roots.length ? (
            <Section title="Emplacements">
              <List>
                {roots.map((l) => (
                  <LocationRow key={l.id} loc={l} />
                ))}
              </List>
            </Section>
          ) : (
            <Empty icon="🏠" title="Bienvenue !">
              Commence par créer tes grands lieux : <b>Maison</b>, <b>Garage</b>, <b>Cave</b>… puis les pièces, les meubles et les
              boîtes à l’intérieur.
              <div className="mt-4">
                <Link to="/l/nouveau?type=lieu" className="inline-block rounded-xl bg-kraft text-white px-4 py-2.5 font-medium">
                  Créer mon premier lieu
                </Link>
              </div>
            </Empty>
          )}
          {loose.length > 0 && (
            <Section title={`Pas encore rangés (${loose.length})`}>
              <List>
                {loose.map((it) => (
                  <ItemRow key={it.id} item={it} showPath={false} />
                ))}
              </List>
            </Section>
          )}
        </div>
      )}

      {roots.length > 0 && (
        <button
          onClick={() => setAddOpen(true)}
          className="no-print fixed z-30 right-4 bottom-24 h-14 pl-5 pr-6 rounded-full bg-kraft text-white shadow-lg shadow-kraft/30 flex items-center gap-2 font-semibold active:bg-kraft-fonce"
        >
          <span className="text-2xl leading-none">+</span> Ajouter
        </button>
      )}

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Ajouter">
        <div className="grid grid-cols-2 gap-3">
          <Link to="/o/nouveau" className="rounded-2xl bg-white border border-trait p-4 text-center active:bg-carton-clair">
            <p className="text-3xl">🔹</p>
            <p className="font-medium mt-1">Un objet</p>
          </Link>
          <Link to="/l/nouveau?type=boite" className="rounded-2xl bg-white border border-trait p-4 text-center active:bg-carton-clair">
            <p className="text-3xl">📦</p>
            <p className="font-medium mt-1">Une boîte</p>
          </Link>
          <Link to="/l/nouveau?type=meuble" className="rounded-2xl bg-white border border-trait p-4 text-center active:bg-carton-clair">
            <p className="text-3xl">🗄️</p>
            <p className="font-medium mt-1">Un meuble</p>
          </Link>
          <Link to="/l/nouveau?type=piece" className="rounded-2xl bg-white border border-trait p-4 text-center active:bg-carton-clair">
            <p className="text-3xl">🚪</p>
            <p className="font-medium mt-1">Une pièce / un lieu</p>
          </Link>
        </div>
        <p className="text-xs text-gris mt-3 text-center">Astuce : ouvre d’abord une boîte, puis « + Objet » pour la remplir directement.</p>
      </Sheet>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        <div className="space-y-3">
          <p className="text-sm text-gris">
            {locations.length} emplacements · {items.length} objets
          </p>
          <Button variant="secondary" className="w-full" onClick={() => supabase.auth.signOut()}>
            Se déconnecter
          </Button>
        </div>
      </Sheet>
    </Page>
  )
}

function Stats() {
  const { items, locations } = useData()
  const boxes = locations.filter((l) => l.kind === 'boite').length
  const out = items.filter((i) => i.is_out).length
  if (!items.length && !locations.length) return null
  return (
    <div className="grid grid-cols-3 gap-2">
      <Stat n={items.length} label="objets" />
      <Stat n={boxes} label="boîtes" />
      <Link to="/sortis">
        <Stat n={out} label="à ranger" alert={out > 0} />
      </Link>
    </div>
  )
}

function Stat({ n, label, alert }) {
  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${alert ? 'bg-rouge/5 border-rouge/30' : 'bg-white border-trait'}`}>
      <p className={`text-2xl font-bold ${alert ? 'text-rouge' : 'text-kraft'}`}>{n}</p>
      <p className="text-xs text-gris">{label}</p>
    </div>
  )
}

function SearchResults({ results, q }) {
  const { locations, items } = results
  if (!locations.length && !items.length)
    return (
      <Empty icon="🤷" title={`Rien trouvé pour « ${q} »`}>
        Essaie un autre mot, un tag ou un numéro de boîte.
      </Empty>
    )
  return (
    <div className="space-y-6">
      {items.length > 0 && (
        <Section title={`Objets (${items.length})`}>
          <List>
            {items.slice(0, 100).map((it) => (
              <ItemRow key={it.id} item={it} />
            ))}
          </List>
        </Section>
      )}
      {locations.length > 0 && (
        <Section title={`Emplacements (${locations.length})`}>
          <List>
            {locations.slice(0, 50).map((l) => (
              <LocationRow key={l.id} loc={l} showPath />
            ))}
          </List>
        </Section>
      )}
    </div>
  )
}
