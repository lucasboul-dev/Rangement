import { Link } from 'react-router-dom'
import { useData } from '../lib/store.jsx'
import { pathLabel } from '../lib/tree.js'
import { Page, Empty, Thumb } from '../components/ui.jsx'

export default function OutList() {
  const data = useData()
  const out = data.items.filter((i) => i.is_out).sort((a, b) => (b.out_at || '').localeCompare(a.out_at || ''))

  return (
    <Page title="À ranger">
      {out.length === 0 ? (
        <Empty icon="✨" title="Tout est à sa place">
          Quand tu sors un objet de sa boîte, appuie sur « Je le sors » : il apparaîtra ici avec l’endroit où le remettre.
        </Empty>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gris px-1">
            {out.length} objet{out.length > 1 ? 's' : ''} sorti{out.length > 1 ? 's' : ''} de {out.length > 1 ? 'leur' : 'sa'} place.
          </p>
          <div className="rounded-2xl bg-white border border-trait divide-y divide-trait overflow-hidden">
            {out.map((it) => (
              <div key={it.id} className="flex items-center gap-3 px-3 py-2.5">
                <Link to={`/o/${it.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <Thumb path={it.photo_path} fallback="🔹" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{it.name}</p>
                    <p className="text-xs text-gris truncate">↩ {pathLabel(data.index, it.location_id)}</p>
                    {it.out_at && (
                      <p className="text-[11px] text-gris">sorti le {new Date(it.out_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => data.setOut(it, false)}
                  className="shrink-0 rounded-xl bg-vert text-white text-sm font-medium px-3 h-10 active:opacity-80"
                >
                  ✓ Rangé
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Page>
  )
}
