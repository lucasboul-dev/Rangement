import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../lib/store.jsx'
import { locationLabel, pathOf } from '../lib/tree.js'
import { usePhotoUrl } from '../lib/photos.js'
import { errorMessage } from '../lib/supabase.js'
import { Page, Button, Empty, ErrorNote } from '../components/ui.jsx'
import { MovePicker } from '../components/MovePicker.jsx'

export default function ItemPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const data = useData()
  const item = data.items.find((i) => i.id === id)
  const photo = usePhotoUrl(item?.photo_path, { thumb: false })
  const [moving, setMoving] = useState(false)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')

  if (!item)
    return (
      <Page title="Introuvable" back="/">
        <Empty icon="❓" title="Cet objet n’existe plus" />
      </Page>
    )

  const path = pathOf(data.index, item.location_id)
  const backHref = item.location_id ? `/l/${item.location_id}` : '/'

  const act = (fn, msg) => async () => {
    setError('')
    try {
      await fn()
      if (msg) setFlash(msg)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  async function move(targetId) {
    setMoving(false)
    await act(() => data.updateItem(item.id, { location_id: targetId, is_out: false, out_at: null, out_by: null }), 'Rangé au nouvel endroit ✓')()
  }

  async function remove() {
    if (!confirm(`Supprimer « ${item.name} » ?`)) return
    try {
      await data.deleteItem(item)
      navigate(backHref, { replace: true })
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const setQty = (q) => act(() => data.updateItem(item.id, { quantity: Math.max(0, q) }))()

  return (
    <Page title={item.name} back={backHref}>
      <div className="space-y-5">
        {photo ? (
          <img src={photo} alt="" className="w-full max-h-96 object-cover rounded-2xl border border-trait" />
        ) : (
          <div className="h-32 rounded-2xl bg-carton-clair grid place-items-center text-5xl">🔹</div>
        )}

        <div>
          <h2 className="text-2xl font-bold leading-tight">{item.name}</h2>
          {item.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {item.tags.map((t) => (
                <Link key={t} to={`/?q=${encodeURIComponent(t)}`} className="text-xs rounded-full bg-carton-clair text-kraft-fonce px-2.5 py-1">
                  #{t}
                </Link>
              ))}
            </div>
          )}
        </div>

        {flash && <p className="rounded-xl bg-vert/10 text-vert text-sm px-3 py-2 font-medium">{flash}</p>}
        <ErrorNote error={error} />

        {/* Où */}
        <div className={`rounded-2xl border p-4 space-y-2 ${item.is_out ? 'bg-rouge/5 border-rouge/30' : 'bg-white border-trait'}`}>
          <p className="text-xs uppercase tracking-wider font-semibold text-gris">
            {item.is_out ? 'Sorti — à remettre dans' : 'Rangé dans'}
          </p>
          {path.length ? (
            <div className="space-y-1">
              {path.map((p, i) => (
                <Link key={p.id} to={`/l/${p.id}`} className="flex items-center gap-2" style={{ paddingLeft: i * 14 }}>
                  <span className="text-gris">{i ? '└' : ''}</span>
                  <span className={i === path.length - 1 ? 'font-semibold text-kraft' : ''}>{locationLabel(p)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gris">Pas encore rangé</p>
          )}
          {item.is_out && item.out_at && (
            <p className="text-xs text-rouge">Sorti le {new Date(item.out_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
          )}
        </div>

        {/* Quantité */}
        <div className="flex items-center justify-between rounded-2xl bg-white border border-trait px-4 py-2">
          <span className="text-gris">Quantité</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setQty(item.quantity - 1)} className="size-10 rounded-full border border-trait text-xl active:bg-carton-clair" aria-label="Moins">
              −
            </button>
            <span className="text-xl font-semibold w-8 text-center">{item.quantity}</span>
            <button onClick={() => setQty(item.quantity + 1)} className="size-10 rounded-full border border-trait text-xl active:bg-carton-clair" aria-label="Plus">
              +
            </button>
          </div>
        </div>

        {item.notes && <p className="whitespace-pre-wrap rounded-2xl bg-white border border-trait px-4 py-3 text-sm">{item.notes}</p>}

        <div className="grid grid-cols-2 gap-2">
          {item.is_out ? (
            <Button className="col-span-2 h-12 !bg-vert" onClick={act(() => data.setOut(item, false), 'Remis à sa place ✓')}>
              ✓ Je l’ai rangé
            </Button>
          ) : (
            <Button className="col-span-2 h-12" onClick={act(() => data.setOut(item, true), 'Noté comme sorti — il apparaît dans « À ranger »')}>
              🧺 Je le sors
            </Button>
          )}
          <Button variant="secondary" onClick={() => setMoving(true)}>
            ↪️ Déplacer
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/o/${item.id}/modifier`)}>
            ✏️ Modifier
          </Button>
          <Button variant="danger" className="col-span-2" onClick={remove}>
            🗑️ Supprimer
          </Button>
        </div>
      </div>

      <MovePicker
        open={moving}
        onClose={() => setMoving(false)}
        onPick={move}
        currentId={item.location_id}
        rootLabel="Nulle part (pas rangé)"
        title={`Ranger « ${item.name} » dans…`}
      />
    </Page>
  )
}
