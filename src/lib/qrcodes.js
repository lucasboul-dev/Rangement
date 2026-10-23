// Codes courts imprimés sur les étiquettes. Sans caractères ambigus (0/O, 1/I/L).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function makeCode(length = 6, rand = Math.random) {
  let s = ''
  for (let i = 0; i < length; i++) s += ALPHABET[Math.floor(rand() * ALPHABET.length)]
  return s
}

export function qrUrl(code, origin = globalThis.location?.origin || '') {
  return `${origin}/q/${code}`
}

/** Extrait le code d'un texte scanné : URL de l'appli, ou code brut. */
export function parseScanned(text) {
  if (!text) return null
  const t = text.trim()
  const m = t.match(/\/q\/([A-Za-z0-9]{4,12})\/?(?:[?#].*)?$/)
  if (m) return m[1].toUpperCase()
  if (/^[A-Za-z0-9]{4,12}$/.test(t)) return t.toUpperCase()
  return null
}

/** Formats de planches A4 (dimensions en mm). */
export const SHEETS = {
  l7160: {
    label: '21 étiquettes 63,5 × 38,1 mm (Avery L7160 / J8160)',
    cols: 3, rows: 7, w: 63.5, h: 38.1, top: 15.15, left: 7.2, gapX: 2.5, gapY: 0, cut: false,
  },
  e3474: {
    label: '24 étiquettes 70 × 37 mm (Avery 3474)',
    cols: 3, rows: 8, w: 70, h: 37, top: 0.5, left: 0, gapX: 0, gapY: 0, cut: false,
  },
  l7163: {
    label: '14 étiquettes 99,1 × 38,1 mm (Avery L7163)',
    cols: 2, rows: 7, w: 99.1, h: 38.1, top: 15.15, left: 4.65, gapX: 2.5, gapY: 0, cut: false,
  },
  papier: {
    label: 'Papier normal, 12 grandes étiquettes à découper',
    cols: 3, rows: 4, w: 64, h: 66, top: 12, left: 9, gapX: 0, gapY: 0, cut: true,
  },
}

/** Répartit les étiquettes sur des pages, en sautant `skip` cases déjà utilisées sur la 1re page. */
export function paginate(labels, sheet, skip = 0) {
  const perPage = sheet.cols * sheet.rows
  const cells = [...Array(Math.min(skip, perPage - 1)).fill(null), ...labels]
  const pages = []
  for (let i = 0; i < cells.length; i += perPage) {
    const page = cells.slice(i, i + perPage)
    while (page.length < perPage) page.push(null)
    pages.push(page)
  }
  return pages
}
