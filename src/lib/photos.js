import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

const BUCKET = 'photos'
const TTL = 60 * 60 * 24 // 24 h
const cache = new Map() // path -> { url, exp }

/** Redimensionne une photo du téléphone (souvent 4–10 Mo) en JPEG léger. */
export async function resizeImage(file, maxSide, quality = 0.82) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Photo illisible'))), 'image/jpeg', quality),
  )
}

/** Envoie la photo (grande + miniature) et renvoie son chemin. */
export async function uploadPhoto(file) {
  const id = crypto.randomUUID()
  const path = `${id}.jpg`
  const [full, thumb] = await Promise.all([resizeImage(file, 1600), resizeImage(file, 360, 0.75)])
  const opts = { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false }
  const a = await supabase.storage.from(BUCKET).upload(path, full, opts)
  if (a.error) throw a.error
  const b = await supabase.storage.from(BUCKET).upload(thumbPath(path), thumb, opts)
  if (b.error) throw b.error
  return path
}

export async function deletePhoto(path) {
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path, thumbPath(path)])
  cache.delete(path)
  cache.delete(thumbPath(path))
}

export function thumbPath(path) {
  return path.replace(/\.jpg$/, '_t.jpg')
}

async function signedUrl(path) {
  const hit = cache.get(path)
  if (hit && hit.exp > Date.now()) return hit.url
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, TTL)
  if (error) throw error
  cache.set(path, { url: data.signedUrl, exp: Date.now() + (TTL - 600) * 1000 })
  return data.signedUrl
}

/** URL affichable d'une photo (miniature par défaut). */
export function usePhotoUrl(path, { thumb = true } = {}) {
  const p = path ? (thumb ? thumbPath(path) : path) : null
  const [url, setUrl] = useState(() => (p && cache.get(p)?.exp > Date.now() ? cache.get(p).url : null))
  useEffect(() => {
    let alive = true
    if (!p) return setUrl(null)
    signedUrl(p).then((u) => alive && setUrl(u)).catch(() => alive && setUrl(null))
    return () => {
      alive = false
    }
  }, [p])
  return url
}
