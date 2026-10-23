import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import QrScanner from 'qr-scanner'
import { useData, linkQr, getQr } from '../lib/store.jsx'
import { parseScanned } from '../lib/qrcodes.js'
import { parseBoxNumber } from '../lib/search.js'
import { locationLabel } from '../lib/tree.js'
import { errorMessage } from '../lib/supabase.js'
import { Page, Button, ErrorNote, inputClass } from '../components/ui.jsx'

export default function Scanner() {
  const [params] = useSearchParams()
  const linkTo = params.get('lier') // mode « associer une étiquette à cet emplacement »
  const navigate = useNavigate()
  const { index, locations } = useData()
  const target = linkTo ? index.byId.get(linkTo) : null
  const videoRef = useRef(null)
  const handled = useRef(false)
  const [camError, setCamError] = useState('')
  const [error, setError] = useState('')
  const [manual, setManual] = useState('')
  const [torch, setTorch] = useState(null) // null = pas dispo

  async function handleCode(code) {
    if (handled.current) return
    handled.current = true
    navigator.vibrate?.(60)
    if (target) {
      try {
        const existing = await getQr(code)
        if (existing?.location_id && existing.location_id !== target.id) {
          const other = index.byId.get(existing.location_id)
          if (!confirm(`Cette étiquette est déjà sur « ${other ? locationLabel(other) : 'un autre emplacement'} ». La déplacer sur « ${locationLabel(target)} » ?`)) {
            handled.current = false
            return
          }
        }
        await linkQr(code, target.id)
        navigate(`/l/${target.id}`, { replace: true, state: { flash: `Étiquette ${code} associée ✓` } })
      } catch (e) {
        setError(errorMessage(e))
        handled.current = false
      }
    } else {
      navigate(`/q/${code}`, { replace: true })
    }
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const scanner = new QrScanner(
      video,
      (result) => {
        const code = parseScanned(result.data)
        if (code) handleCode(code)
      },
      { returnDetailedScanResult: true, highlightScanRegion: true, highlightCodeOutline: true, preferredCamera: 'environment', maxScansPerSecond: 8 },
    )
    scanner
      .start()
      .then(async () => setTorch((await scanner.hasFlash()) ? false : null))
      .catch((e) => {
        setCamError(
          /NotAllowed|Permission/i.test(String(e))
            ? 'L’accès à la caméra a été refusé. Autorise-le dans les réglages du navigateur (icône 🔒 à côté de l’adresse).'
            : 'Caméra indisponible sur cet appareil.',
        )
      })
    videoRef.current._scanner = scanner
    return () => {
      scanner.stop()
      scanner.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function toggleTorch() {
    const s = videoRef.current?._scanner
    if (!s) return
    await s.toggleFlash()
    setTorch(s.isFlashOn())
  }

  function submitManual(e) {
    e.preventDefault()
    const n = parseBoxNumber(manual)
    if (n != null && !target) {
      const box = locations.find((l) => l.kind === 'boite' && l.number === n)
      if (box) return navigate(`/l/${box.id}`)
      return setError(`Pas de boîte n° ${n}.`)
    }
    const code = parseScanned(manual)
    if (code) return handleCode(code)
    setError('Code non reconnu.')
  }

  return (
    <Page title={target ? `Étiquette pour ${locationLabel(target)}` : 'Scanner une étiquette'} back={target ? `/l/${target.id}` : undefined} nav={!target}>
      <div className="space-y-4">
        <div className="relative aspect-square w-full max-w-md mx-auto rounded-3xl overflow-hidden bg-encre">
          <video ref={videoRef} className="size-full object-cover" playsInline muted />
          {camError && <p className="absolute inset-0 grid place-items-center p-6 text-center text-white/90 text-sm">{camError}</p>}
          {torch !== null && (
            <button onClick={toggleTorch} className="absolute bottom-3 right-3 size-12 rounded-full bg-white/90 text-2xl" aria-label="Lampe">
              {torch ? '🔦' : '💡'}
            </button>
          )}
        </div>
        <p className="text-center text-sm text-gris">
          {target ? 'Vise l’étiquette que tu viens de coller sur cet emplacement.' : 'Vise l’étiquette QR d’une boîte pour l’ouvrir.'}
        </p>
        <ErrorNote error={error} />
        <form onSubmit={submitManual} className="flex gap-2">
          <input
            className={inputClass}
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder={target ? 'Ou tape le code (ex. K7P2QX)' : 'Ou tape un n° de boîte / un code'}
            autoCapitalize="characters"
          />
          <Button variant="secondary" className="h-12 shrink-0">
            OK
          </Button>
        </form>
      </div>
    </Page>
  )
}
