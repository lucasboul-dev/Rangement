import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useData, linkQr } from '../lib/store.jsx'
import { KINDS, pathLabel, canMoveLocation } from '../lib/tree.js'
import { uploadPhoto, deletePhoto } from '../lib/photos.js'
import { errorMessage } from '../lib/supabase.js'
import { Page, Field, inputClass, Button, ErrorNote, PhotoInput, Sheet } from '../components/ui.jsx'
import { NewRoomForm, RoomChips } from '../components/Rooms.jsx'
import { MovePicker } from '../components/MovePicker.jsx'

const PLACEHOLDERS = {
  lieu: 'Maison, Garage, Cave…',
  piece: 'Cuisine, Grenier, Chambre d’amis…',
  meuble: 'Étagère 2, Armoire bleue, Congélateur…',
  boite: 'Noël, Câbles, Vêtements bébé…',
}

export default function LocationForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const data = useData()
  const editing = id ? data.index.byId.get(id) : null
  const qrCode = params.get('qr')

  const parentFromUrl = params.get('dans')
  const defaultKind = (() => {
    const t = params.get('type')
    if (t && KINDS[t]) return t
    if (qrCode) return 'boite'
    const parent = parentFromUrl && data.index.byId.get(parentFromUrl)
    if (!parent) return 'lieu'
    return { lieu: 'piece', piece: 'meuble', meuble: 'boite', boite: 'boite' }[parent.kind]
  })()

  const [kind, setKind] = useState(editing?.kind || defaultKind)
  const [name, setName] = useState(editing?.name || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [parentId, setParentId] = useState(editing ? editing.parent_id : parentFromUrl || null)
  const [file, setFile] = useState(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [picking, setPicking] = useState(false)
  const [newRoom, setNewRoom] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (id && !editing) return <Page title="Introuvable" back="/" />

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Donne-lui un nom.')
    setBusy(true)
    setError('')
    try {
      let photo_path = editing?.photo_path || null
      if (file) photo_path = await uploadPhoto(file)
      else if (removePhoto) photo_path = null
      const fields = { kind, name: name.trim(), notes: notes.trim(), parent_id: parentId, photo_path }
      let saved
      if (editing) {
        saved = await data.updateLocation(editing.id, fields)
        if (editing.photo_path && editing.photo_path !== photo_path) deletePhoto(editing.photo_path).catch(() => {})
      } else {
        saved = await data.createLocation(fields)
      }
      if (qrCode) await linkQr(qrCode, saved.id)
      navigate(`/l/${saved.id}`, { replace: true, state: qrCode ? { flash: `Étiquette ${qrCode} associée ✓` } : undefined })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Page title={editing ? 'Modifier' : `Nouveau : ${KINDS[kind].label.toLowerCase()}`} back nav={false}>
      <form onSubmit={submit} className="space-y-5">
        {qrCode && (
          <p className="rounded-xl bg-carton-clair text-kraft-fonce text-sm px-3 py-2">
            🏷️ L’étiquette <b>{qrCode}</b> sera associée à cet emplacement.
          </p>
        )}

        <Field label="Type">
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(KINDS).map(([k, v]) => (
              <button
                type="button"
                key={k}
                onClick={() => setKind(k)}
                className={`rounded-xl border py-2 text-xs flex flex-col items-center gap-0.5 ${
                  kind === k ? 'bg-kraft text-white border-kraft' : 'bg-white border-trait'
                }`}
              >
                <span className="text-xl">{v.icon}</span>
                {v.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </Field>


        <Field label="Nom">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder={PLACEHOLDERS[kind]} autoFocus={!editing} />
        </Field>

        <Field label="Se trouve dans">
          <button type="button" onClick={() => setPicking(true)} className={`${inputClass} text-left flex items-center justify-between`}>
            <span className={`truncate ${parentId ? '' : 'text-gris'}`}>{parentId ? pathLabel(data.index, parentId) : 'Nulle part (tout en haut)'}</span>
            <span className="text-gris">›</span>
          </button>
          {(kind === 'boite' || kind === 'meuble') && (
            <div className="pt-1">
              <RoomChips
                wrap
                selectedId={parentId}
                onSelect={(r) => setParentId(r.id)}
                onAdd={() => setNewRoom(true)}
                disabled={(r) => editing && !canMoveLocation(data.index, editing.id, r.id)}
              />
            </div>
          )}
        </Field>

        <Field label="Photo (facultatif)" hint="Une photo de la boîte ou de l’étagère aide à la reconnaître.">
          <PhotoInput
            currentPath={removePhoto ? null : editing?.photo_path}
            file={file}
            onFile={(f) => (setFile(f), setRemovePhoto(false))}
            onRemove={() => (setFile(null), setRemovePhoto(true))}
          />
        </Field>

        <Field
          label={kind === 'boite' || kind === 'meuble' ? 'Contenu / description (facultatif)' : 'Notes (facultatif)'}
          hint={kind === 'boite' || kind === 'meuble' ? 'Pas besoin de créer chaque objet : liste ce qu’il y a dedans, la recherche le trouvera.' : undefined}
        >
          <textarea
            className={`${inputClass} h-28 py-2`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={kind === 'boite' || kind === 'meuble' ? 'Ex. guirlandes, boules de Noël, nappe rouge, bougies…' : 'Ex. étagère du haut, derrière les valises'}
          />
        </Field>

        <ErrorNote error={error} />
        <Button className="w-full h-12" disabled={busy}>
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </form>

      <Sheet open={newRoom} onClose={() => setNewRoom(false)} title="Nouvelle pièce">
        {newRoom && <NewRoomForm onCreated={(r) => (setParentId(r.id), setNewRoom(false))} onCancel={() => setNewRoom(false)} />}
      </Sheet>

      <MovePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(pid) => (setParentId(pid), setPicking(false))}
        movingLocationId={editing?.id}
        currentId={parentId}
        rootLabel="Nulle part (tout en haut)"
        title="Se trouve dans…"
      />
    </Page>
  )
}
