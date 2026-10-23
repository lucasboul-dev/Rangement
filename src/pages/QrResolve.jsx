import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useData, getQr, linkQr } from '../lib/store.jsx'
import { errorMessage } from '../lib/supabase.js'
import { Page, Spinner, Button, ErrorNote } from '../components/ui.jsx'
import { MovePicker } from '../components/MovePicker.jsx'

/** Ouvert quand on scanne une étiquette (depuis l'appli ou l'appareil photo du téléphone). */
export default function QrResolve() {
  const code = useParams().code.toUpperCase()
  const navigate = useNavigate()
  const { index } = useData()
  const [qr, setQr] = useState(undefined)
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getQr(code)
      .then((r) => setQr(r || { code, location_id: null }))
      .catch((e) => setError(errorMessage(e)))
  }, [code])

  if (qr?.location_id && index.byId.has(qr.location_id)) return <Navigate to={`/l/${qr.location_id}`} replace />

  async function pick(locId) {
    setPicking(false)
    if (!locId) return
    try {
      await linkQr(code, locId)
      navigate(`/l/${locId}`, { replace: true, state: { flash: `Étiquette ${code} associée ✓` } })
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Page title={`Étiquette ${code}`} back="/">
      {qr === undefined && !error ? (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-5 text-center pt-6">
          <p className="text-5xl">🏷️</p>
          <div>
            <p className="text-lg font-semibold">Étiquette neuve</p>
            <p className="text-gris text-sm">Le code {code} n’est encore associé à rien. Que veux-tu en faire ?</p>
          </div>
          <ErrorNote error={error} />
          <div className="grid gap-2 max-w-sm mx-auto">
            <Link to={`/l/nouveau?type=boite&qr=${code}`} className="rounded-xl bg-kraft text-white h-12 grid place-items-center font-medium">
              📦 Créer une nouvelle boîte
            </Link>
            <Button variant="secondary" className="h-12" onClick={() => setPicking(true)}>
              Associer à un emplacement existant
            </Button>
          </div>
        </div>
      )}
      <MovePicker open={picking} onClose={() => setPicking(false)} onPick={pick} allowRoot={false} title={`Coller l’étiquette ${code} sur…`} />
    </Page>
  )
}
