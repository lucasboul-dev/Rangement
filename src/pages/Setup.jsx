export default function Setup() {
  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <div className="max-w-md space-y-4">
        <p className="text-5xl">🛠️</p>
        <h1 className="text-xl font-semibold">Il manque la connexion à Supabase</h1>
        <p className="text-gris">
          Ajoute les variables <code className="bg-carton-clair px-1 rounded">VITE_SUPABASE_URL</code> et{' '}
          <code className="bg-carton-clair px-1 rounded">VITE_SUPABASE_ANON_KEY</code> (fichier <code>.env</code> en local, ou
          Netlify &gt; Site configuration &gt; Environment variables), puis relance le déploiement.
        </p>
        <p className="text-gris">Tout est expliqué dans le README du dépôt.</p>
      </div>
    </div>
  )
}
