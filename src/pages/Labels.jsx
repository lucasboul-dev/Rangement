import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { useData, insertBlankCodes, linkQr, listQrByLocation } from '../lib/store.jsx'
import { SHEETS, makeCode, paginate, qrUrl } from '../lib/qrcodes.js'
import { boxCode, locationLabel, pathLabel, compareLocations, KINDS } from '../lib/tree.js'
import { errorMessage } from '../lib/supabase.js'
import { Page, Button, Field, inputClass, ErrorNote, Spinner } from '../components/ui.jsx'

const SHEET_KEY = 'rangement.sheet'

function savedSheet() {
  try {
    return localStorage.getItem(SHEET_KEY) || 'l7160'
  } catch {
    return 'l7160'
  }
}

export default function Labels() {
  const [params] = useSearchParams()
  const preselect = params.get('pour')
  const { locations, index } = useData()
  const [mode, setMode] = useState(preselect ? 'boites' : 'vierges')
  const [sheetKey, setSheetKey] = useState(savedSheet)
  const sheet = SHEETS[sheetKey] || SHEETS.l7160
  const perPage = sheet.cols * sheet.rows
  const [count, setCount] = useState(perPage)
  const [skip, setSkip] = useState(0)
  const [qrMap, setQrMap] = useState(null)
  const [selected, setSelected] = useState(() => new Set(preselect ? [preselect] : []))
  const [onlyMissing, setOnlyMissing] = useState(!preselect)
  const [labels, setLabels] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(SHEET_KEY, sheetKey)
    } catch {
      /* stockage indisponible */
    }
  }, [sheetKey])

  useEffect(() => {
    listQrByLocation()
      .then(setQrMap)
      .catch((e) => setError(errorMessage(e)))
  }, [])

  const candidates = useMemo(() => {
    const list = [...locations].sort(compareLocations)
    return onlyMissing && qrMap ? list.filter((l) => !qrMap.has(l.id) || selected.has(l.id)) : list
  }, [locations, onlyMissing, qrMap, selected])

  function toggle(id) {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  async function generate() {
    setBusy(true)
    setError('')
    try {
      let raw
      if (mode === 'vierges') {
        const n = Math.max(1, Math.min(200, Number(count) || perPage))
        const codes = new Set()
        while (codes.size < n) codes.add(makeCode())
        await insertBlankCodes([...codes])
        raw = [...codes].map((code) => ({ code, blank: true }))
      } else {
        const chosen = [...selected].map((id) => index.byId.get(id)).filter(Boolean).sort(compareLocations)
        if (!chosen.length) throw new Error('Coche au moins un emplacement.')
        const map = new Map(qrMap)
        for (const loc of chosen) {
          if (!map.has(loc.id)) {
            const code = makeCode()
            await linkQr(code, loc.id)
            map.set(loc.id, code)
          }
        }
        setQrMap(map)
        raw = chosen.map((loc) => ({
          code: map.get(loc.id),
          title: loc.kind === 'boite' ? boxCode(loc) : locationLabel(loc),
          subtitle: loc.kind === 'boite' ? loc.name || (loc.parent_id ? locationLabel(index.byId.get(loc.parent_id)) : '') : loc.parent_id ? pathLabel(index, loc.parent_id) : '',
        }))
      }
      const withImages = await Promise.all(
        raw.map(async (l) => ({ ...l, img: await QRCode.toDataURL(qrUrl(l.code), { margin: 0, width: 400, errorCorrectionLevel: 'M' }) })),
      )
      setLabels(withImages)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page title="Étiquettes" back={preselect ? `/l/${preselect}` : undefined}>
      <div className="no-print space-y-5">
        {!labels && (
          <>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-carton-clair/60">
              {[
                ['vierges', 'Étiquettes vierges'],
                ['boites', 'Pour mes boîtes'],
              ].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setMode(k)}
                  className={`h-10 rounded-xl text-sm font-medium ${mode === k ? 'bg-white shadow-sm text-kraft' : 'text-gris'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="text-sm text-gris">
              {mode === 'vierges'
                ? 'Imprime une planche d’avance et colle les étiquettes au fur et à mesure. Au premier scan, l’appli te propose de créer la boîte. Une étiquette peut être réattribuée à tout moment.'
                : 'Imprime les étiquettes d’emplacements déjà créés, avec leur numéro et leur nom.'}
            </p>

            <Field label="Format de planche (A4)">
              <select className={inputClass} value={sheetKey} onChange={(e) => (setSheetKey(e.target.value), setCount(SHEETS[e.target.value].cols * SHEETS[e.target.value].rows))}>
                {Object.entries(SHEETS).map(([k, s]) => (
                  <option key={k} value={k}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              {mode === 'vierges' && (
                <Field label="Nombre d’étiquettes">
                  <input className={inputClass} type="number" inputMode="numeric" min="1" max="200" value={count} onChange={(e) => setCount(e.target.value)} />
                </Field>
              )}
              <Field label="Cases déjà utilisées" hint="Pour finir une planche entamée">
                <input className={inputClass} type="number" inputMode="numeric" min="0" max={perPage - 1} value={skip} onChange={(e) => setSkip(Math.max(0, Math.min(perPage - 1, Number(e.target.value) || 0)))} />
              </Field>
            </div>

            {mode === 'boites' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} className="size-4 accent-kraft" />
                    Seulement ceux sans étiquette
                  </label>
                  <button
                    className="text-sm text-kraft font-medium"
                    onClick={() => setSelected(selected.size ? new Set() : new Set(candidates.map((l) => l.id)))}
                  >
                    {selected.size ? 'Tout décocher' : 'Tout cocher'}
                  </button>
                </div>
                {!qrMap ? (
                  <Spinner />
                ) : (
                  <div className="rounded-2xl bg-white border border-trait divide-y divide-trait overflow-hidden max-h-96 overflow-y-auto">
                    {candidates.map((l) => (
                      <label key={l.id} className="flex items-center gap-3 px-3 py-2.5">
                        <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} className="size-5 accent-kraft" />
                        <span>{KINDS[l.kind]?.icon}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block truncate">{locationLabel(l)}</span>
                          <span className="block text-xs text-gris truncate">{l.parent_id ? pathLabel(index, l.parent_id) : '—'}</span>
                        </span>
                        {qrMap.has(l.id) && <span className="text-[11px] text-vert">🏷️ {qrMap.get(l.id)}</span>}
                      </label>
                    ))}
                    {candidates.length === 0 && <p className="px-3 py-4 text-sm text-gris">Tout a déjà une étiquette 👍</p>}
                  </div>
                )}
              </div>
            )}

            <ErrorNote error={error} />
            <Button className="w-full h-12" onClick={generate} disabled={busy || (mode === 'boites' && !selected.size)}>
              {busy ? 'Préparation…' : 'Préparer les étiquettes'}
            </Button>
          </>
        )}

        {labels && (
          <div className="space-y-3">
            <p className="rounded-xl bg-vert/10 text-vert text-sm px-3 py-2">
              {labels.length} étiquette{labels.length > 1 ? 's' : ''} prête{labels.length > 1 ? 's' : ''}. À l’impression, choisis{' '}
              <b>Taille réelle / 100 %</b> et <b>aucune marge</b>.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button className="h-12" onClick={() => window.print()}>
                🖨️ Imprimer
              </Button>
              <Button variant="secondary" className="h-12" onClick={() => setLabels(null)}>
                Recommencer
              </Button>
            </div>
          </div>
        )}
      </div>

      {labels && <Sheets labels={labels} sheet={sheet} skip={skip} />}
    </Page>
  )
}

function Sheets({ labels, sheet, skip }) {
  const pages = paginate(labels, sheet, skip)
  const [zoom, setZoom] = useState(1)
  useEffect(() => {
    const fit = () => setZoom(Math.min(1, (Math.min(window.innerWidth, 672) - 32) / 794))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return (
    <div className="sheets mt-5 flex flex-col items-center gap-4" style={{ zoom }}>
      {pages.map((cells, p) => (
        <div key={p} className="sheet shadow-md">
          {cells.map((label, i) => {
            const col = i % sheet.cols
            const row = Math.floor(i / sheet.cols)
            return (
              <div
                key={i}
                className={sheet.cut ? 'cut' : ''}
                style={{
                  position: 'absolute',
                  left: `${sheet.left + col * (sheet.w + sheet.gapX)}mm`,
                  top: `${sheet.top + row * (sheet.h + sheet.gapY)}mm`,
                  width: `${sheet.w}mm`,
                  height: `${sheet.h}mm`,
                  outline: sheet.cut ? '0.2mm dashed #ccc' : undefined,
                }}
              >
                {label && <LabelCell label={label} sheet={sheet} />}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function LabelCell({ label, sheet }) {
  const vertical = sheet.h > 50
  const pad = 2.5
  const qr = vertical ? Math.min(sheet.w - 14, sheet.h - 24) : Math.min(sheet.h - pad * 2, sheet.w * 0.48)
  const title = label.blank ? 'Boîte n°' : label.title
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        padding: `${pad}mm`,
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        alignItems: 'center',
        gap: vertical ? '1.5mm' : '2.5mm',
        color: '#111',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <img src={label.img} alt="" style={{ width: `${qr}mm`, height: `${qr}mm`, flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1, textAlign: vertical ? 'center' : 'left', lineHeight: 1.1, width: vertical ? '100%' : undefined }}>
        <div style={{ fontWeight: 800, fontSize: label.blank ? '9pt' : vertical ? '18pt' : '15pt', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </div>
        {label.blank ? (
          <div style={{ borderBottom: '0.3mm solid #999', height: '7mm', margin: '0.5mm 1mm 1.5mm 0' }} />
        ) : (
          label.subtitle && (
            <div style={{ fontSize: '8pt', marginTop: '1mm', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {label.subtitle}
            </div>
          )
        )}
        <div style={{ fontSize: '6.5pt', marginTop: '1mm', color: '#666', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.05em' }}>
          {label.code}
        </div>
      </div>
    </div>
  )
}
