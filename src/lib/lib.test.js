import { describe, it, expect } from 'vitest'
import { buildIndex, pathLabel, canMoveLocation, countItemsDeep, locationLabel, boxCode, roomsOf, defaultRoomParent, scopeIds, pathFrom, boxesWithin, itemsWithin } from './tree.js'
import { normalize, parseBoxNumber, search, snippet } from './search.js'
import { parseScanned, makeCode, paginate, SHEETS } from './qrcodes.js'

const locations = [
  { id: 'maison', parent_id: null, kind: 'lieu', name: 'Maison' },
  { id: 'grenier', parent_id: 'maison', kind: 'piece', name: 'Grenier' },
  { id: 'etag', parent_id: 'grenier', kind: 'meuble', name: 'Étagère 2' },
  { id: 'b12', parent_id: 'etag', kind: 'boite', name: 'Noël', number: 12 },
  { id: 'b3', parent_id: 'grenier', kind: 'boite', name: '', number: 3 },
  { id: 'garage', parent_id: null, kind: 'lieu', name: 'Garage' },
]
const items = [
  { id: 'i1', location_id: 'b12', name: 'Guirlandes lumineuses', tags: ['noël'], notes: '' },
  { id: 'i2', location_id: 'b12', name: 'Boules de sapin', tags: [], notes: '' },
  { id: 'i3', location_id: 'garage', name: 'Tournevis cruciforme', tags: ['outils'], notes: '' },
  { id: 'i4', location_id: 'b3', name: 'Tente de camping', tags: ['camping'], notes: '4 places' },
  { id: 'i5', location_id: null, name: 'Rallonge électrique', tags: [], notes: '' },
]
const index = buildIndex(locations, items)

describe('arborescence', () => {
  it('affiche le chemin complet', () => {
    expect(pathLabel(index, 'b12')).toBe('Maison › Grenier › Étagère 2 › Boîte Noël')
    expect(pathLabel(index, null)).toBe('Non rangé')
  })
  it('nomme les boîtes', () => {
    expect(locationLabel(locations[3])).toBe('Boîte Noël')
    expect(locationLabel(locations[4])).toBe('Boîte 3') // ancienne boîte sans nom
    expect(locationLabel({ kind: 'boite', name: 'Boîte à chaussures', number: 9 })).toBe('Boîte à chaussures')
  })
  it('interdit de ranger un emplacement dans lui-même ou un descendant', () => {
    expect(canMoveLocation(index, 'grenier', 'b12')).toBe(false)
    expect(canMoveLocation(index, 'grenier', 'grenier')).toBe(false)
    expect(canMoveLocation(index, 'b12', 'garage')).toBe(true)
    expect(canMoveLocation(index, 'b12', null)).toBe(true)
  })
  it('compte les objets en profondeur', () => {
    expect(countItemsDeep(index, 'maison')).toBe(3)
    expect(countItemsDeep(index, 'garage')).toBe(1)
  })
  it('range les objets sans emplacement sous null', () => {
    expect(index.itemsByLoc.get(null).map((i) => i.id)).toEqual(['i5'])
  })
})

describe('pièces', () => {
  it('propose les pièces et les lieux sans pièces', () => {
    expect(roomsOf(index, locations).map((l) => l.name)).toEqual(['Garage', 'Grenier'])
  })
  it('crée les nouvelles pièces dans la maison', () => {
    expect(defaultRoomParent(index)).toBe('maison')
    expect(defaultRoomParent(buildIndex([], []))).toBe(null)
  })
  it('délimite une pièce et affiche le chemin relatif', () => {
    expect([...scopeIds(index, 'grenier')].sort()).toEqual(['b12', 'b3', 'etag', 'grenier'])
    expect(pathFrom(index, 'grenier', 'b12')).toBe('Étagère 2 › Boîte Noël')
  })
})

describe('contenu', () => {
  it('liste les boîtes d’un meuble ou d’une pièce, par nom', () => {
    expect(boxesWithin(index, 'grenier').map((b) => b.number)).toEqual([3, 12])
    expect(boxesWithin(index, 'etag').map((b) => b.number)).toEqual([12])
    expect(boxesWithin(index, 'garage')).toEqual([])
  })
  it('liste les objets à tous les niveaux', () => {
    expect(itemsWithin(index, 'grenier').map((i) => i.id)).toEqual(['i2', 'i1', 'i4'])
  })
})

describe('recherche', () => {
  it('normalise accents et majuscules', () => {
    expect(normalize('  Étagère   NOËL ')).toBe('etagere noel')
  })
  it('reconnaît un numéro de boîte', () => {
    expect(parseBoxNumber('12')).toBe(12)
    expect(parseBoxNumber('B-012')).toBe(12)
    expect(parseBoxNumber('boîte 12')).toBe(12)
    expect(parseBoxNumber('tente')).toBe(null)
  })
  it('tolère les fautes et les accents', () => {
    expect(search('tournevi', items, locations, index).items[0].id).toBe('i3')
    expect(search('guirlande', items, locations, index).items[0].id).toBe('i1')
    expect(search('noel', items, locations, index).locations[0].id).toBe('b12')
  })
  it('cherche dans les tags', () => {
    expect(search('camping', items, locations, index).items.map((i) => i.id)).toContain('i4')
  })
  it('un numéro de boîte remonte la boîte et son contenu', () => {
    const r = search('12', items, locations, index)
    expect(r.locations[0].id).toBe('b12')
    expect(r.items.map((i) => i.id).slice(0, 2).sort()).toEqual(['i1', 'i2'])
  })
  it('requête vide = rien', () => {
    expect(search('  ', items, locations, index).items).toEqual([])
  })
})

describe('description des boîtes', () => {
  const long = 'vieux câbles HDMI, chargeurs, une souris, rallonges, piles AA et AAA, télécommande de la télé, disque dur externe, vieux téléphone Nokia, lampe frontale, tournevis de précision'
  const locs = [
    { id: 'g', parent_id: null, kind: 'piece', name: 'Grenier', notes: '' },
    { id: 'e', parent_id: 'g', kind: 'boite', name: 'Électronique', notes: long },
    { id: 'd', parent_id: 'g', kind: 'boite', name: 'Déco', notes: 'guirlandes, boules de noël, nappe rouge, bougies, crèche' },
  ]
  const idx = buildIndex(locs, [])
  const top = (q) => search(q, [], locs, idx).locations[0]?.id
  it('trouve une boîte par un mot de sa description', () => {
    expect(top('tournevis')).toBe('e')
    expect(top('nokia')).toBe('e')
    expect(top('creche')).toBe('d')
  })
  it('tolère les fautes et plusieurs mots', () => {
    expect(top('nape')).toBe('d')
    expect(top('tournevi')).toBe('e')
    expect(top('piles telecommande')).toBe('e')
  })
  it('donne l’extrait qui correspond', () => {
    const s = snippet(long, 'nokia')
    expect(s.match).toBe('Nokia')
    expect(s.before.endsWith('téléphone ')).toBe(true)
    expect(snippet('guirlandes, crèche', 'creche').match).toBe('crèche')
    expect(snippet('guirlandes, nappe rouge', 'nape').match).toBe('nappe')
    expect(snippet('rien à voir', 'perceuse')).toBe(null)
  })
})

describe('QR', () => {
  it('lit une URL de l’appli ou un code brut', () => {
    expect(parseScanned('https://rangement.netlify.app/q/AB34CD')).toBe('AB34CD')
    expect(parseScanned('https://x.app/q/ab34cd/')).toBe('AB34CD')
    expect(parseScanned('ab34cd')).toBe('AB34CD')
    expect(parseScanned('https://autre-site.com/page')).toBe(null)
  })
  it('génère des codes sans caractères ambigus', () => {
    for (let i = 0; i < 200; i++) expect(makeCode()).toMatch(/^[A-HJKMNP-Z2-9]{6}$/)
  })
  it('remplit les planches en sautant les cases déjà utilisées', () => {
    const pages = paginate(['a', 'b', 'c'], SHEETS.l7160, 20)
    expect(pages.length).toBe(2)
    expect(pages[0][20]).toBe('a')
    expect(pages[1][0]).toBe('b')
    expect(pages[1].length).toBe(21)
  })
})
