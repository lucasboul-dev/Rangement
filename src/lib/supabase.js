import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key)

export const supabase = isConfigured
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null

/** Transforme une erreur Supabase en message lisible. */
export function errorMessage(err) {
  if (!err) return ''
  const m = err.message || String(err)
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou mot de passe incorrect.'
  if (/row-level security|permission denied/i.test(m)) return 'Accès refusé : ce compte n’est pas dans la liste du foyer.'
  if (/foreign key|violates.*restrict/i.test(m)) return 'Impossible : cet emplacement contient encore des choses.'
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Pas de connexion internet.'
  if (/QuotaExceeded|NotReadable|decode|Photo illisible/i.test(m) || err.name === 'InvalidStateError')
    return 'Impossible de lire cette photo. Essaie avec « Galerie » ou une autre photo.'
  return m
}
