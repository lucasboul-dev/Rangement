import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useData } from '../lib/store.jsx'
import { search } from '../lib/search.js'
import { supabase } from '../lib/supabase.js'
import { locationLabel, scopeIds, KINDS } from '../lib/tree.js'
import { Page, Section, Empty, Sheet, Button } from '../components/ui.jsx'
import { ItemRow, LocationRow, List, ContentsPreview } from '../components/rows.jsx'
import { NewRoomForm, RoomChips } from '../components/Rooms.jsx'

export default function Home() {
  const { locations, items, index } = useData()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const roomId = params.get('piece')
  const room = roomId ? index.byId.get(roomId) : null
  const [addOpen, setAddOpen] = useState(false)
  const [roomOpen, setRoomOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const scope = useMemo(() => (room ? scopeIds(index, room.id) : null), [room, index])

  const results = useMemo(() => {
    if (!q.trim()) return null
    const r = search(q, items, locations, index)
    if (!scope) return r
    return {
      items: r.items.filter((it) => scope.has(it.location_id)),
      locations: r.locations.filter((l) => scope.has(l.id) && l.id !== room.id),
    }
  }, [q, items, locations, index, scope, room])

  const roots = index.children.get(null) || []
  const loose = index.itemsByLoc.get(null) || []

  const update = (next) => {
    const p = { q, piece: roomId, ...next }
    const clean = Object.fromEntries(Object.entries(p).filter(([, v]) => v))
    setParams(clean, { replace: true })
  }
  const setQ = (v) => update({ q: v })
  const selectRoom = (r) => update({ piece: r && r.id !== roomId ? r.id : null })

  return (
    <Page
      title="Rangement des Lulu"
      actions={
        <button onClick={() => setMenuOpen(true)} className="size-10 grid place-items-center rounded-full active:bg-carton-clair text-xl" aria-label="Menu">
          ⋯
        </button>
      }
    >
      <div className="sticky top-14 z-10 -mx-4 px-4 pb-3 pt-1 bg-papier space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gris">🔍</span>
          <input
            type="search"
            role="searchbox"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={room ? `Chercher dans ${locationLabel(room)}…` : 'Où est… ? (objet, tag, boîte)'}
            className="w-full h-12 rounded-2xl bg-white border border-trait pl-10 pr-10 outline-none focus:border-kraft focus:ring-2 focus:ring-carton-clair shadow-sm"
            enterKeyHint="search"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-full text-gris" aria-label="Effacer">
              ✕
            </button>
          )}
        </div>
        {locations.length > 0 && <RoomChips selectedId={roomId} onSelect={selectRoom} onAdd={() => setRoomOpen(true)} />}
      </div>

      {results ? (
        <SearchResults results={results} q={q} room={room} />
      ) : room ? (
        <RoomView room={room} />
      ) : (
        <div className="space-y-6">
          {roots.length ? (
            <div className="grid grid-cols-2 gap-3">
              <CategoryTile to="/emplacements" icon="🗄️" label="Emplacements" hint="Pièces, meubles, étagères" />
              <CategoryTile to="/boites" icon="📦" label="Boîtes" hint={`${locations.filter((l) => l.kind === 'boite').length} dans la maison`} />
            </div>
          ) : (
            <Empty icon="🏠" title="Bienvenue !">
              Commence par créer tes pièces : <b>Cuisine</b>, <b>Garage</b>, <b>Grenier</b>… puis les meubles et les boîtes à
              l’intérieur.
              <div className="mt-4">
                <button onClick={() => setRoomOpen(true)} className="inline-block rounded-xl bg-kraft text-white px-4 py-2.5 font-medium">
                  Créer ma première pièce
                </button>
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

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title={room ? `Ajouter dans ${locationLabel(room)}` : 'Ajouter'}>
        <div className="grid grid-cols-2 gap-3">
          <AddTile to={room ? `/o/nouveau?dans=${room.id}` : '/o/nouveau'} icon="🔹" label="Un objet" />
          <AddTile to={`/l/nouveau?type=boite${room ? `&dans=${room.id}` : ''}`} icon="📦" label="Une boîte" />
          <AddTile to={`/l/nouveau?type=meuble${room ? `&dans=${room.id}` : ''}`} icon="🗄️" label="Un meuble" />
          <button
            onClick={() => (setAddOpen(false), setRoomOpen(true))}
            className="rounded-2xl bg-white border border-trait p-4 text-center active:bg-carton-clair"
          >
            <p className="text-3xl">🚪</p>
            <p className="font-medium mt-1">Une pièce</p>
          </button>
        </div>
        <p className="text-xs text-gris mt-3 text-center">Astuce : ouvre d’abord une boîte, puis « + Objet » pour la remplir directement.</p>
      </Sheet>

      <Sheet open={roomOpen} onClose={() => setRoomOpen(false)} title="Nouvelle pièce">
        {roomOpen && (
          <NewRoomForm
            onCreated={(r) => {
              setRoomOpen(false)
              update({ piece: r.id, q: '' })
            }}
            onCancel={() => setRoomOpen(false)}
          />
        )}
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

function AddTile({ to, icon, label }) {
  return (
    <Link to={to} className="rounded-2xl bg-white border border-trait p-4 text-center active:bg-carton-clair">
      <p className="text-3xl">{icon}</p>
      <p className="font-medium mt-1">{label}</p>
    </Link>
  )
}

/** Tout ce qu'il y a dans une pièce, sur une seule page. */
function RoomView({ room }) {
  const { index, items } = useData()
  const scope = scopeIds(index, room.id)
  const subs = index.children.get(room.id) || []
  const all = items.filter((it) => scope.has(it.location_id)).sort((a, b) => a.name.localeCompare(b.name, 'fr'))

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-trait p-4 flex items-center gap-3">
        <div className="size-12 rounded-xl bg-carton-clair grid place-items-center text-2xl">{KINDS[room.kind]?.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg truncate">{locationLabel(room)}</p>
          <ContentsPreview loc={room} />
        </div>
        <Link to={`/l/${room.id}`} className="shrink-0 rounded-xl border border-trait px-3 h-10 grid place-items-center text-sm font-medium text-kraft active:bg-carton-clair">
          Ouvrir ›
        </Link>
      </div>

      {subs.length > 0 && (
        <Section title={`Meubles et boîtes (${subs.length})`}>
          <List>
            {subs.map((s) => (
              <LocationRow key={s.id} loc={s} />
            ))}
          </List>
        </Section>
      )}

      <Section title={`Tous les objets de la pièce (${all.length})`}>
        {all.length ? (
          <List>
            {all.map((it) => (
              <ItemRow key={it.id} item={it} fromId={room.id} />
            ))}
          </List>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-trait text-center text-sm text-gris py-6">
            Rien dans cette pièce pour l’instant.
            <div className="mt-3 flex justify-center gap-2">
              <Link to={`/l/nouveau?type=boite&dans=${room.id}`} className="rounded-xl bg-kraft text-white px-3 py-2 font-medium">
                + Boîte
              </Link>
              <Link to={`/o/nouveau?dans=${room.id}`} className="rounded-xl border border-trait bg-white px-3 py-2 font-medium text-kraft">
                + Objet
              </Link>
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}

function CategoryTile({ to, icon, label, hint }) {
  return (
    <Link to={to} className="rounded-2xl bg-white border border-trait p-4 active:bg-carton-clair flex flex-col gap-1">
      <span className="text-3xl">{icon}</span>
      <span className="font-semibold text-lg">{label}</span>
      <span className="text-xs text-gris">{hint}</span>
    </Link>
  )
}

function SearchResults({ results, q, room }) {
  const { locations, items } = results
  if (!locations.length && !items.length)
    return (
      <Empty icon="🤷" title={`Rien trouvé pour « ${q} »${room ? ` dans ${locationLabel(room)}` : ''}`}>
        {room ? 'Retire le filtre de pièce pour chercher dans toute la maison.' : 'Essaie un autre mot, un tag ou un nom de boîte.'}
      </Empty>
    )
  return (
    <div className="space-y-6">
      {items.length > 0 && (
        <Section title={`Objets (${items.length})`}>
          <List>
            {items.slice(0, 100).map((it) => (
              <ItemRow key={it.id} item={it} fromId={room?.id} />
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
