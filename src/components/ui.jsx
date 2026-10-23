import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { usePhotoUrl } from '../lib/photos.js'
import { KINDS } from '../lib/tree.js'
import { useData } from '../lib/store.jsx'

export function Spinner({ className = '' }) {
  return (
    <span
      className={`inline-block size-6 rounded-full border-[3px] border-carton-clair border-t-kraft animate-spin ${className}`}
      aria-label="Chargement"
    />
  )
}

/** Page standard : en-tête + contenu + barre de navigation du bas */
export function Page({ title, back, actions, children, nav = true }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="no-print sticky top-0 z-20 bg-papier/95 backdrop-blur border-b border-trait">
        <div className="mx-auto max-w-2xl flex items-center gap-2 px-3 h-14">
          {back !== undefined && (
            <button
              onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
              className="-ml-1 size-10 grid place-items-center rounded-full active:bg-carton-clair text-xl"
              aria-label="Retour"
            >
              ←
            </button>
          )}
          <h1 className="flex-1 min-w-0 truncate font-semibold text-lg">{title}</h1>
          {actions}
        </div>
      </header>
      <main className={`flex-1 mx-auto w-full max-w-2xl px-4 py-4 ${nav ? 'pb-28' : 'pb-10'}`}>{children}</main>
      {nav && <BottomNav />}
    </div>
  )
}

function BottomNav() {
  const { items } = useData()
  const outCount = items.filter((i) => i.is_out).length
  const tab = ({ isActive }) =>
    `flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'text-kraft font-semibold' : 'text-gris'}`
  return (
    <nav className="no-print fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t border-trait safe-bottom">
      <div className="mx-auto max-w-2xl flex">
        <NavLink to="/" end className={tab}>
          <span className="text-xl">🏠</span>Maison
        </NavLink>
        <NavLink to="/scanner" className={tab}>
          <span className="text-xl">📷</span>Scanner
        </NavLink>
        <NavLink to="/sortis" className={tab}>
          <span className="relative text-xl">
            🧺
            {outCount > 0 && (
              <span className="absolute -top-1 -right-3 min-w-5 h-5 px-1 rounded-full bg-rouge text-white text-[11px] grid place-items-center font-semibold">
                {outCount}
              </span>
            )}
          </span>
          À ranger
        </NavLink>
        <NavLink to="/etiquettes" className={tab}>
          <span className="text-xl">🏷️</span>Étiquettes
        </NavLink>
      </div>
    </nav>
  )
}

export function Button({ variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-kraft text-white active:bg-kraft-fonce disabled:opacity-50',
    secondary: 'bg-white border border-trait text-encre active:bg-carton-clair disabled:opacity-50',
    danger: 'bg-white border border-rouge/40 text-rouge active:bg-rouge/10',
    ghost: 'text-kraft active:bg-carton-clair',
  }
  return <button className={`rounded-xl px-4 h-11 font-medium transition ${styles[variant]} ${className}`} {...props} />
}

export function Fab({ to, label }) {
  return (
    <Link
      to={to}
      className="no-print fixed z-30 right-4 bottom-24 h-14 pl-5 pr-6 rounded-full bg-kraft text-white shadow-lg shadow-kraft/30 flex items-center gap-2 font-semibold active:bg-kraft-fonce"
    >
      <span className="text-2xl leading-none">+</span> {label}
    </Link>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-gris">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gris">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-xl border border-trait bg-white px-3 h-12 outline-none focus:border-kraft focus:ring-2 focus:ring-carton-clair'

export function Section({ title, right, children }) {
  return (
    <section className="space-y-2">
      {(title || right) && (
        <div className="flex items-end justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gris">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-2xl bg-white border border-trait overflow-hidden ${className}`}>{children}</div>
}

export function Thumb({ path, fallback = '📦', size = 'size-12', className = '' }) {
  const url = usePhotoUrl(path)
  return (
    <div className={`${size} shrink-0 rounded-xl bg-carton-clair grid place-items-center overflow-hidden ${className}`}>
      {url ? <img src={url} alt="" className="size-full object-cover" loading="lazy" /> : <span className="text-xl">{fallback}</span>}
    </div>
  )
}

export function Empty({ icon = '📦', title, children }) {
  return (
    <div className="text-center py-10 px-6 space-y-2">
      <p className="text-4xl">{icon}</p>
      <p className="font-semibold">{title}</p>
      {children && <div className="text-sm text-gris">{children}</div>}
    </div>
  )
}

export function ErrorNote({ error }) {
  if (!error) return null
  return <p className="rounded-xl bg-rouge/10 text-rouge text-sm px-3 py-2">{error}</p>
}

/** Panneau qui monte du bas de l'écran */
export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
  if (!open) return null
  return (
    <div className="no-print fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-encre/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85dvh] flex flex-col bg-papier rounded-t-3xl sm:rounded-3xl shadow-xl safe-bottom">
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <h3 className="flex-1 font-semibold">{title}</h3>
          <button onClick={onClose} className="size-10 grid place-items-center rounded-full active:bg-carton-clair" aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-4">{children}</div>
      </div>
    </div>
  )
}

export function KindIcon({ kind }) {
  return KINDS[kind]?.icon || '📦'
}

/**
 * Choix / prise de photo, avec aperçu.
 * Deux entrées : l'appareil photo (capture directe) et la galerie (photo déjà prise).
 * La galerie sert aussi de solution quand l'appareil photo d'Android refuse de s'ouvrir
 * (ex. « espace de stockage insuffisant »).
 */
export function PhotoInput({ currentPath, file, onFile, onRemove }) {
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)
  const currentUrl = usePhotoUrl(file ? null : currentPath, { thumb: false })
  const [preview, setPreview] = useState(null)
  useEffect(() => {
    if (!file) return setPreview(null)
    const u = URL.createObjectURL(file)
    setPreview(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  const shown = preview || currentUrl
  const pick = (e) => {
    const f = e.target.files?.[0]
    e.target.value = '' // permet de reprendre la même photo
    if (f) onFile(f)
  }
  const tile =
    'h-28 rounded-2xl border-2 border-dashed border-carton bg-carton-clair/40 text-kraft font-medium flex flex-col items-center justify-center gap-1 active:bg-carton-clair'
  return (
    <div className="space-y-2">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      {shown ? (
        <div className="relative">
          <img src={shown} alt="" className="w-full max-h-72 object-cover rounded-2xl border border-trait" />
          <div className="absolute bottom-2 right-2 flex gap-2">
            <Button type="button" variant="secondary" className="h-9 px-3 text-sm" onClick={() => cameraRef.current?.click()} aria-label="Reprendre avec l’appareil photo">
              📸
            </Button>
            <Button type="button" variant="secondary" className="h-9 px-3 text-sm" onClick={() => galleryRef.current?.click()} aria-label="Choisir dans la galerie">
              🖼️
            </Button>
            <Button type="button" variant="danger" className="h-9 text-sm" onClick={onRemove}>
              Retirer
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => cameraRef.current?.click()} className={tile}>
            <span className="text-3xl">📸</span>
            Appareil photo
          </button>
          <button type="button" onClick={() => galleryRef.current?.click()} className={tile}>
            <span className="text-3xl">🖼️</span>
            Galerie
          </button>
        </div>
      )}
    </div>
  )
}
