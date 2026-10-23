import { useState } from 'react'
import { supabase, errorMessage } from '../lib/supabase.js'
import { Button, ErrorNote, Field, inputClass } from '../components/ui.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError(errorMessage(error))
  }

  return (
    <div className="min-h-dvh flex flex-col justify-center px-6 py-10">
      <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-5">
        <div className="text-center space-y-2 mb-8">
          <img src="/icon.svg" alt="" className="size-20 mx-auto" />
          <h1 className="text-2xl font-bold">Rangement des Lulu</h1>
          <p className="text-gris">Ce qu’on a à la maison, et où.</p>
        </div>
        <Field label="E-mail">
          <input className={inputClass} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Mot de passe">
          <input
            className={inputClass}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <ErrorNote error={error} />
        <Button className="w-full h-12" disabled={busy}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
    </div>
  )
}
