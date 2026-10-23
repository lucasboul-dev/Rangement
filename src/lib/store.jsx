import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { supabase } from './supabase.js'
import { buildIndex } from './tree.js'
import { deletePhoto } from './photos.js'

const DataContext = createContext(null)

function upsert(list, row) {
  const i = list.findIndex((x) => x.id === row.id)
  if (i === -1) return [...list, row]
  const copy = list.slice()
  copy[i] = { ...copy[i], ...row }
  return copy
}

function reducer(state, action) {
  switch (action.type) {
    case 'load':
      return { ...state, ...action.data, loaded: true }
    case 'upsert':
      return { ...state, [action.table]: upsert(state[action.table], action.row) }
    case 'delete':
      return { ...state, [action.table]: state[action.table].filter((x) => x.id !== action.id) }
    default:
      return state
  }
}

const TABLES = { locations: 'locations', items: 'items' }

export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { locations: [], items: [], loaded: false })
  const [error, setError] = useState(null)

  const loadAll = useCallback(async () => {
    const [l, i] = await Promise.all([
      supabase.from('locations').select('*'),
      supabase.from('items').select('*'),
    ])
    if (l.error || i.error) {
      setError(l.error || i.error)
      return
    }
    setError(null)
    dispatch({ type: 'load', data: { locations: l.data, items: i.data } })
  }, [])

  useEffect(() => {
    loadAll()
    // Synchro en direct : ce que fait l'un apparaît chez l'autre
    const channel = supabase.channel('foyer')
    for (const table of Object.keys(TABLES)) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        if (payload.eventType === 'DELETE') dispatch({ type: 'delete', table, id: payload.old.id })
        else dispatch({ type: 'upsert', table, row: payload.new })
      })
    }
    channel.subscribe()
    // En revenant sur l'appli, on recharge (au cas où un événement a été manqué)
    const onVisible = () => document.visibilityState === 'visible' && loadAll()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [loadAll])

  const run = useCallback(async (table, query) => {
    const { data, error } = await query
    if (error) throw error
    if (data) dispatch({ type: 'upsert', table, row: data })
    return data
  }, [])

  const actions = useMemo(
    () => ({
      reload: loadAll,
      createLocation: (fields) => run('locations', supabase.from('locations').insert(fields).select().single()),
      updateLocation: (id, fields) =>
        run('locations', supabase.from('locations').update(fields).eq('id', id).select().single()),
      async deleteLocation(loc) {
        const { error } = await supabase.from('locations').delete().eq('id', loc.id)
        if (error) throw error
        dispatch({ type: 'delete', table: 'locations', id: loc.id })
        deletePhoto(loc.photo_path).catch(() => {})
      },
      createItem: (fields) => run('items', supabase.from('items').insert(fields).select().single()),
      updateItem: (id, fields) => run('items', supabase.from('items').update(fields).eq('id', id).select().single()),
      async deleteItem(item) {
        const { error } = await supabase.from('items').delete().eq('id', item.id)
        if (error) throw error
        dispatch({ type: 'delete', table: 'items', id: item.id })
        deletePhoto(item.photo_path).catch(() => {})
      },
      async setOut(item, out) {
        const { data: u } = await supabase.auth.getUser()
        return run(
          'items',
          supabase
            .from('items')
            .update({ is_out: out, out_at: out ? new Date().toISOString() : null, out_by: out ? u.user?.id : null })
            .eq('id', item.id)
            .select()
            .single(),
        )
      },
    }),
    [loadAll, run],
  )

  const index = useMemo(() => buildIndex(state.locations, state.items), [state.locations, state.items])

  const value = useMemo(() => ({ ...state, index, error, ...actions }), [state, index, error, actions])
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}

// ---------- Étiquettes QR ----------

export async function getQr(code) {
  const { data, error } = await supabase.from('qr_codes').select('*').eq('code', code).maybeSingle()
  if (error) throw error
  return data
}

export async function getQrForLocation(locationId) {
  const { data, error } = await supabase.from('qr_codes').select('*').eq('location_id', locationId).maybeSingle()
  if (error) throw error
  return data
}

/** Associe une étiquette à un emplacement (l'ancienne étiquette de l'emplacement est libérée). */
export async function linkQr(code, locationId) {
  const free = await supabase.from('qr_codes').update({ location_id: null }).eq('location_id', locationId).neq('code', code)
  if (free.error) throw free.error
  const { error } = await supabase.from('qr_codes').upsert({ code, location_id: locationId })
  if (error) throw error
}

export async function unlinkQr(code) {
  const { error } = await supabase.from('qr_codes').update({ location_id: null }).eq('code', code)
  if (error) throw error
}

export async function insertBlankCodes(codes) {
  const { error } = await supabase.from('qr_codes').insert(codes.map((code) => ({ code })))
  if (error) throw error
}

export async function listQrByLocation() {
  const { data, error } = await supabase.from('qr_codes').select('*').not('location_id', 'is', null)
  if (error) throw error
  return new Map(data.map((r) => [r.location_id, r.code]))
}
