import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useData, getQrForLocation, unlinkQr } from '../lib/store.jsx'
import { locationLabel, pathOf, KINDS, canMoveLocation } from '../lib/tree.js'
import { usePhotoUrl } from '../lib/photos.js'
import { errorMessage } from '../lib/supabase.js'
import { Page, Section, Empty, Sheet, Button, ErrorNote } from '../components/ui.jsx'
import { ItemRow, LocationRow, List } from '../components/rows.jsx'
import { MovePicker } from '../components/MovePicker.jsx'

/** Ce qu'on peut ajouter selon l'emplacement ouvert (le plus courant en premier). */
const OBJET = { label: 'Un objet', icon: '🔹' }
const BOITE = { label: 'Une boîte', icon: '📦', type: 'boite' }
const MEUBLE = { label: 'Un meuble', icon: '🗄️', type: 'meuble' }
const PIECE = { label: 'Une pièce', icon: '🚪', type: 'piece' }
const ADD_CHOICES = {
  lieu: [PIECE, MEUBLE, BOITE, OBJET],
  piece: [MEUBLE, BOITE, OBJET],
  meuble: [BOITE, OBJET, { label: 'Un meuble / étagère', icon: '🗄️', type: 'meuble' }],
  boite: [OBJET, { label: 'Une boîte dedans', icon: '📦', type: 'boite' }],
}

export default function LocationPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const routerLoc = useLocation()
  const data = useData()
  const { index } = data
  const loc = index.byId.get(id)
  const [menu, setMenu] = useState(false)
  const [adding, setAdding] = useState(false)
  const [moving, setMoving] = useState(false)
  const [qr, setQr] = useState(undefined)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState(routerLoc.state?.flash || '')
  const photo = usePhotoUrl(loc?.photo_path, { thumb: false })

  useEffect(() => {
    if (!loc) return
    getQrForLocation(loc.id).then(setQr).catch(() => setQr(null))
  }, [loc?.id])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(''), 3500)
    return () => clearTimeout(t)
  }, [flash])

  if (!loc)
    return (
      <Page title="Introuvable" back="/">
        <Empty icon="❓" title="Cet emplacement n’existe plus" />
      </Page>
    )

  const path = pathOf(index, loc.id)
  const subs = index.children.get(loc.id) || []
  const items = index.itemsByLoc.get(loc.id) || []
  const parentHref = loc.parent_id ? `/l/${loc.parent_id}` : '/'

  async function doMove(targetId) {
    setMoving(false)
    if (!canMoveLocation(index, loc.id, targetId)) return setError('Impossible de ranger un emplacement dans lui-même.')
    try {
      await data.updateLocation(loc.id, { parent_id: targetId })
      setFlash('Déplacé ✓')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  async function toggleFull() {
    setMenu(false)
    try {
      await data.updateLocation(loc.id, { is_full: !loc.is_full })
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  async function remove() {
    setMenu(false)
    if (subs.length || items.length) return setError('Vide d’abord cet emplacement (objets et sous-emplacements) avant de le supprimer.')
    if (!confirm(`Supprimer « ${locationLabel(loc)} » ?`)) return
    try {
      await data.deleteLocation(loc)
      navigate(parentHref, { replace: true })
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  async function detachQr() {
    setMenu(false)
    if (!qr || !confirm(`Détacher l’étiquette ${qr.code} ? Elle pourra être réutilisée sur une autre boîte.`)) return
    await unlinkQr(qr.code)
    setQr(null)
  }

  return (
    <Page
      title={locationLabel(loc)}
      back={parentHref}
      actions={
        <button onClick={() => setMenu(true)} className="size-10 grid place-items-center rounded-full active:bg-carton-clair text-xl" aria-label="Actions">
          ⋯
        </button>
      }
    >
      <div className="space-y-5">
        <nav className="flex flex-wrap items-center gap-1 text-sm text-gris">
          <Link to="/" className="underline-offset-2 hover:underline">
            Accueil
          </Link>
          {path.slice(0, -1).map((p) => (
            <span key={p.id} className="flex items-center gap-1">
              <span>›</span>
              <Link to={`/l/${p.id}`} className="underline-offset-2 hover:underline">
                {locationLabel(p)}
              </Link>
            </span>
          ))}
        </nav>

        <div className="flex items-start gap-3">
          <div className="size-14 rounded-2xl bg-carton-clair grid place-items-center text-3xl shrink-0">{KINDS[loc.kind]?.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider text-gris font-semibold">
              {KINDS[loc.kind]?.label}
            </p>
            <p className="text-xl font-bold leading-tight">{locationLabel(loc)}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {loc.is_full && <span className="text-xs font-semibold rounded-full bg-rouge/10 text-rouge px-2 py-1">Pleine</span>}
              {qr === null && (
                <Link to={`/scanner?lier=${loc.id}`} className="text-xs font-medium rounded-full bg-carton-clair text-kraft-fonce px-2 py-1">
                  🏷️ Coller une étiquette
                </Link>
              )}
              {qr && <span className="text-xs font-medium rounded-full bg-vert/10 text-vert px-2 py-1">🏷️ Étiquette {qr.code}</span>}
            </div>
          </div>
        </div>

        {flash && <p className="rounded-xl bg-vert/10 text-vert text-sm px-3 py-2 font-medium">{flash}</p>}
        <ErrorNote error={error} />

        {photo && <img src={photo} alt="" className="w-full max-h-80 object-cover rounded-2xl border border-trait" />}
        {loc.notes && (
          <Section title={loc.kind === 'boite' || loc.kind === 'meuble' ? 'Contenu / description' : 'Notes'}>
            <p className="whitespace-pre-wrap rounded-2xl bg-white border border-trait px-3 py-2.5 text-sm">{loc.notes}</p>
          </Section>
        )}

        {subs.length > 0 && (
          <Section title={`Dedans (${subs.length})`}>
            <List>
              {subs.map((s) => (
                <LocationRow key={s.id} loc={s} />
              ))}
            </List>
          </Section>
        )}

        <Section
          title={`Objets (${items.length})`}
          right={
            <Link to={`/l/nouveau?dans=${loc.id}`} className="text-sm text-kraft font-medium">
              + Sous-emplacement
            </Link>
          }
        >
          {items.length ? (
            <List>
              {items.map((it) => (
                <ItemRow key={it.id} item={it} showPath={false} />
              ))}
            </List>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-trait text-center text-sm text-gris py-6">Rien ici pour l’instant.</div>
          )}
        </Section>
      </div>

      <button
        onClick={() => setAdding(true)}
        className="no-print fixed z-30 right-4 bottom-24 h-14 pl-5 pr-6 rounded-full bg-kraft text-white shadow-lg shadow-kraft/30 flex items-center gap-2 font-semibold active:bg-kraft-fonce"
      >
        <span className="text-2xl leading-none">+</span> Ajouter
      </button>

      <Sheet open={adding} onClose={() => setAdding(false)} title={`Ajouter dans ${locationLabel(loc)}`}>
        <div className="grid grid-cols-2 gap-3">
          {ADD_CHOICES[loc.kind].map((c) => (
            <Link
              key={c.label}
              to={c.type ? `/l/nouveau?type=${c.type}&dans=${loc.id}` : `/o/nouveau?dans=${loc.id}`}
              className="rounded-2xl bg-white border border-trait p-4 text-center active:bg-carton-clair"
            >
              <p className="text-3xl">{c.icon}</p>
              <p className="font-medium mt-1">{c.label}</p>
            </Link>
          ))}
        </div>
      </Sheet>

      <Sheet open={menu} onClose={() => setMenu(false)} title={locationLabel(loc)}>
        <div className="grid gap-2">
          <Button variant="secondary" onClick={() => navigate(`/l/${loc.id}/modifier`)}>
            ✏️ Modifier
          </Button>
          <Button variant="secondary" onClick={() => (setMenu(false), setMoving(true))}>
            ↪️ Déplacer ailleurs
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/l/nouveau?dans=${loc.id}`)}>
            ➕ Ajouter un emplacement dedans
          </Button>
          {loc.kind === 'boite' && (
            <Button variant="secondary" onClick={toggleFull}>
              {loc.is_full ? '📭 Marquer comme pas pleine' : '📦 Marquer comme pleine'}
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate(`/scanner?lier=${loc.id}`)}>
            🏷️ {qr ? 'Changer d’étiquette (scanner)' : 'Associer une étiquette (scanner)'}
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/etiquettes?pour=${loc.id}`)}>
            🖨️ Imprimer son étiquette
          </Button>
          {qr && (
            <Button variant="secondary" onClick={detachQr}>
              ✂️ Détacher l’étiquette {qr.code}
            </Button>
          )}
          <Button variant="danger" onClick={remove}>
            🗑️ Supprimer
          </Button>
        </div>
      </Sheet>

      <MovePicker
        open={moving}
        onClose={() => setMoving(false)}
        onPick={doMove}
        movingLocationId={loc.id}
        currentId={loc.parent_id}
        title={`Déplacer « ${locationLabel(loc)} » dans…`}
      />
    </Page>
  )
}
