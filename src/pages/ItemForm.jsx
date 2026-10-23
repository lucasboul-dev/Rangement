import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useData } from '../lib/store.jsx'
import { pathLabel } from '../lib/tree.js'
import { normalize } from '../lib/search.js'
import { uploadPhoto, deletePhoto } from '../lib/photos.js'
import { errorMessage } from '../lib/supabase.js'
import { Page, Field, inputClass, Button, ErrorNote, PhotoInput } from '../components/ui.jsx'
import { MovePicker } from '../components/MovePicker.jsx'

export default function ItemForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const data = useData()
  const editing = id ? data.items.find((i) => i.id === id) : null

  const [locationId, setLocationId] = useState(editing ? editing.location_id : params.get('dans') || null)
  const [name, setName] = useState(editing?.name || '')
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1)
  const [tags, setTags] = useState(editing?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [file, setFile] = useState(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [added, setAdded] = useState([])

  // Tous les tags déjà utilisés, les plus fréquents d'abord
  const knownTags = useMemo(() => {
    const count = new Map()
    for (const it of data.items) for (const t of it.tags || []) count.set(t, (count.get(t) || 0) + 1)
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
  }, [data.items])

  const suggestions = knownTags
    .filter((t) => !tags.includes(t))
    .filter((t) => !tagInput || normalize(t).startsWith(normalize(tagInput)))
    .slice(0, 8)

  if (id && !editing) return <Page title="Introuvable" back="/" />

  function addTag(raw) {
    const t = raw.trim().replace(/^#/, '').toLowerCase()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }

  function onTagKey(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags(tags.slice(0, -1))
    }
  }

  async function save(another) {
    if (!name.trim()) return setError('Donne un nom à l’objet.')
    setBusy(true)
    setError('')
    try {
      const allTags = tagInput.trim() ? [...new Set([...tags, tagInput.trim().toLowerCase()])] : tags
      let photo_path = editing?.photo_path || null
      if (file) photo_path = await uploadPhoto(file)
      else if (removePhoto) photo_path = null
      const fields = {
        name: name.trim(),
        quantity: Math.max(0, Number(quantity) || 0),
        tags: allTags,
        notes: notes.trim(),
        location_id: locationId,
        photo_path,
      }
      if (editing) {
        await data.updateItem(editing.id, fields)
        if (editing.photo_path && editing.photo_path !== photo_path) deletePhoto(editing.photo_path).catch(() => {})
        navigate(`/o/${editing.id}`, { replace: true })
        return
      }
      const saved = await data.createItem(fields)
      if (another) {
        // On reste sur le formulaire, même emplacement, mêmes tags : saisie en rafale
        setAdded((a) => [saved.name, ...a])
        setName('')
        setQuantity(1)
        setNotes('')
        setFile(null)
        setTagInput('')
        setBusy(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        navigate(locationId ? `/l/${locationId}` : `/o/${saved.id}`, { replace: true })
      }
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Page title={editing ? 'Modifier l’objet' : 'Nouvel objet'} back nav={false}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save(false)
        }}
        className="space-y-5"
      >
        {added.length > 0 && (
          <p className="rounded-xl bg-vert/10 text-vert text-sm px-3 py-2">
            ✓ Ajouté{added.length > 1 ? 's' : ''} : {added.slice(0, 4).join(', ')}
            {added.length > 4 ? '…' : ''}
          </p>
        )}

        <Field label="Rangé dans">
          <button type="button" onClick={() => setPicking(true)} className={`${inputClass} text-left flex items-center justify-between`}>
            <span className={`truncate ${locationId ? 'font-medium' : 'text-gris'}`}>{locationId ? pathLabel(data.index, locationId) : 'Pas encore rangé'}</span>
            <span className="text-gris">›</span>
          </button>
        </Field>

        <PhotoInput
          currentPath={removePhoto ? null : editing?.photo_path}
          file={file}
          onFile={(f) => (setFile(f), setRemovePhoto(false))}
          onRemove={() => (setFile(null), setRemovePhoto(true))}
        />

        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <Field label="Nom">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Perceuse, guirlandes…" autoFocus={!editing} enterKeyHint="done" />
          </Field>
          <Field label="Quantité">
            <input className={`${inputClass} text-center`} type="number" inputMode="numeric" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
        </div>

        <Field label="Tags" hint="Pour regrouper : noël, camping, outils, bébé… Valide avec Entrée ou une virgule.">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-trait bg-white px-2 py-2 min-h-12 focus-within:border-kraft focus-within:ring-2 focus-within:ring-carton-clair">
            {tags.map((t) => (
              <button type="button" key={t} onClick={() => setTags(tags.filter((x) => x !== t))} className="text-sm rounded-full bg-carton-clair text-kraft-fonce pl-2.5 pr-2 py-1">
                #{t} ✕
              </button>
            ))}
            <input
              className="flex-1 min-w-24 outline-none bg-transparent px-1 h-8"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={onTagKey}
              onBlur={() => tagInput.trim() && addTag(tagInput)}
              placeholder={tags.length ? '' : 'Ajouter un tag'}
              enterKeyHint="enter"
            />
          </div>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {suggestions.map((t) => (
                <button type="button" key={t} onClick={() => addTag(t)} className="text-xs rounded-full border border-trait bg-white px-2.5 py-1 text-gris active:bg-carton-clair">
                  + {t}
                </button>
              ))}
            </div>
          )}
        </Field>

        <Field label="Notes (facultatif)">
          <textarea className={`${inputClass} h-24 py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Taille, couleur, à qui c’est…" />
        </Field>

        <ErrorNote error={error} />

        <div className="grid gap-2">
          <Button className="h-12" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          {!editing && (
            <Button type="button" variant="secondary" className="h-12" disabled={busy} onClick={() => save(true)}>
              Enregistrer et ajouter le suivant
            </Button>
          )}
        </div>
      </form>

      <MovePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(lid) => (setLocationId(lid), setPicking(false))}
        currentId={locationId}
        rootLabel="Pas encore rangé"
        title="Rangé dans…"
      />
    </Page>
  )
}
