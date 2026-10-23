# 📦 Rangement des Lulu

Notre inventaire de la maison : **ce qu'on a, et où**. Pièce, meuble, boîte numérotée, étiquette QR.
Application web installable sur Android, partagée à deux, synchronisée en direct.

## Ce que fait la V1

- **Emplacements imbriqués sans limite** : Maison › Grenier › Étagère 2 › Boîte 12 (une boîte peut aller dans une autre).
- **Boîtes numérotées automatiquement** (B-001, B-002…), avec un nom facultatif, une photo et un indicateur « pleine ».
- **Objets** avec photo prise au téléphone, quantité, tags (#noël, #camping…) et notes.
- **Saisie en rafale** : « Enregistrer et ajouter le suivant » garde la boîte et les tags.
- **Recherche instantanée** qui tolère les fautes et les accents (« guirlende » trouve « Guirlandes »). On peut aussi chercher par tag ou par numéro de boîte (« 12 », « b12 »).
- **Étiquettes QR** :
  - impression de planches A4 (Avery L7160, 3474, L7163, ou papier normal à découper) ;
  - étiquettes **vierges d'avance** : au premier scan, l'appli propose de créer la boîte ;
  - une étiquette se **réattribue** ou se **détache** à tout moment ;
  - le scan marche dans l'appli, et aussi avec l'appareil photo normal du téléphone.
- **« À ranger »** : « Je le sors » note l'objet comme sorti, avec l'endroit où le remettre.
- **Déplacer** un objet ou une boîte entière ; l'appli empêche de ranger une boîte dans elle-même.
- **Sécurité** : seules vos deux adresses e-mail ont accès, et les photos sont privées.

Prévu ensuite :
- **V2 (IA)** : photo d'une boîte ouverte → liste d'objets ; dictée vocale ; questions en langage naturel.
- **V3** : historique et annulation, prêts, congélateur et péremption, garanties, export CSV.

---

## Installation (≈ 15 min, gratuit)

### 1. Supabase (base de données, comptes, photos)

1. Crée un compte sur [supabase.com](https://supabase.com), puis **New project** (région : *West EU (Paris)*).
2. **Authentication › Users › Add user › Create new user** : crée ton compte et celui de Lucie (coche *Auto Confirm User*).
3. **Authentication › Sign In / Providers** : désactive **Allow new users to sign up**. Personne d'autre ne pourra créer de compte.
4. **SQL Editor › New query** : colle tout le fichier [`supabase/schema.sql`](supabase/schema.sql). **Remplace les deux adresses e-mail tout en bas**, puis clique **Run**.
5. **Project Settings › API** : note la **Project URL** et la clé **anon public**.

> Pour ajouter une personne plus tard : crée son compte (étape 2), puis lance
> `insert into public.members (email) values ('son@adresse.fr');`

### 2. Netlify (hébergement)

1. Sur [netlify.com](https://app.netlify.com) : **Add new site › Import an existing project › GitHub** › choisis `rangement`.
2. Avant de déployer, ouvre **Environment variables** et ajoute :
   - `VITE_SUPABASE_URL` = la Project URL
   - `VITE_SUPABASE_ANON_KEY` = la clé anon public
3. **Deploy**. Tu obtiens une adresse du type `https://rangement-xxxx.netlify.app`. Tu peux la renommer dans *Site configuration › Change site name*.

> ⚠️ Les QR codes contiennent l'adresse du site. Choisis le nom du site **avant** d'imprimer des étiquettes.

### 3. Sur vos téléphones Android

Ouvre l'adresse dans **Chrome** › menu **⋮** › **Ajouter à l'écran d'accueil**, puis **Installer**.
L'appli s'ouvre alors en plein écran comme une vraie application.

---

## Imprimer les étiquettes

Onglet **Étiquettes**, puis :
- choisis le format de la planche ;
- **Cases déjà utilisées** permet de finir une planche entamée.

Dans la fenêtre d'impression, choisis **taille réelle / 100 %** et **aucune marge**.
Depuis le téléphone, tu peux aussi « Enregistrer en PDF » et imprimer depuis l'ordinateur.

---

## Développement

```bash
npm install
cp .env.example .env   # puis remplis les deux valeurs
npm run dev            # http://localhost:5173
npm test               # tests de l'arborescence, de la recherche et des QR
npm run build
```

Stack : React 18, Vite, Tailwind CSS 4, Supabase (Postgres, Auth, Storage, Realtime), PWA (vite-plugin-pwa), qr-scanner, qrcode, Fuse.js.

```
src/
  lib/        logique : arborescence, recherche, QR, photos, données + synchro
  components/ éléments d'interface communs
  pages/      écrans (accueil, emplacement, objet, scanner, étiquettes, à ranger)
supabase/schema.sql   base de données + règles d'accès
```
