import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { isConfigured, supabase } from './lib/supabase.js'
import { DataProvider, useData } from './lib/store.jsx'
import { Spinner } from './components/ui.jsx'
import Login from './pages/Login.jsx'
import Setup from './pages/Setup.jsx'
import Home from './pages/Home.jsx'
import LocationPage from './pages/LocationPage.jsx'
import LocationForm from './pages/LocationForm.jsx'
import ItemPage from './pages/ItemPage.jsx'
import ItemForm from './pages/ItemForm.jsx'
import Scanner from './pages/Scanner.jsx'
import QrResolve from './pages/QrResolve.jsx'
import Labels from './pages/Labels.jsx'
import OutList from './pages/OutList.jsx'
import { LocationsPage, BoxesPage } from './pages/Browse.jsx'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isConfigured) return <Setup />
  if (session === undefined) return <FullPageSpinner />
  if (!session) return <Login />

  return (
    <DataProvider>
      <Gate>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/l/nouveau" element={<LocationForm />} />
          <Route path="/l/:id" element={<LocationPage />} />
          <Route path="/l/:id/modifier" element={<LocationForm />} />
          <Route path="/o/nouveau" element={<ItemForm />} />
          <Route path="/o/:id" element={<ItemPage />} />
          <Route path="/o/:id/modifier" element={<ItemForm />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/q/:code" element={<QrResolve />} />
          <Route path="/etiquettes" element={<Labels />} />
          <Route path="/sortis" element={<OutList />} />
          <Route path="/emplacements" element={<LocationsPage />} />
          <Route path="/boites" element={<BoxesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Gate>
    </DataProvider>
  )
}

function Gate({ children }) {
  const { loaded, error, reload } = useData()
  if (error && !loaded)
    return (
      <div className="min-h-dvh grid place-items-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          <p className="text-4xl">📦</p>
          <p className="font-semibold">Impossible de charger l’inventaire</p>
          <p className="text-sm text-gris">{error.message}</p>
          <div className="flex gap-2 justify-center">
            <button className="rounded-xl bg-kraft text-white px-4 py-2" onClick={reload}>
              Réessayer
            </button>
            <button className="rounded-xl border border-trait px-4 py-2" onClick={() => supabase.auth.signOut()}>
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    )
  if (!loaded) return <FullPageSpinner />
  return children
}

function FullPageSpinner() {
  return (
    <div className="min-h-dvh grid place-items-center">
      <Spinner />
    </div>
  )
}
