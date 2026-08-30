# FC Crissier — Caisse des amendes

App React/Vite avec Supabase pour la sauvegarde partagée, à déployer sur Netlify.

## 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) → New project (gratuit).
2. Une fois créé : **SQL Editor** → colle le contenu de `supabase-setup.sql` → Run.
3. **Project Settings → API** : note l'URL du projet et la clé `anon public`.

## 2. Tester en local (optionnel)

```bash
npm install
cp .env.example .env.local
# remplis .env.local avec ton URL et ta clé Supabase
npm run dev
```

## 3. Déployer sur Netlify (même workflow que ton projet Coupe du monde)

1. Crée un dépôt GitHub avec ce projet (`git init`, `git add .`, `git commit`, push).
2. Sur [netlify.com](https://netlify.com) → **Add new site → Import an existing project** → connecte le dépôt GitHub.
3. Build settings :
   - Build command : `npm run build`
   - Publish directory : `dist`
4. **Site settings → Environment variables** → ajoute :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. Netlify redéploiera automatiquement à chaque push GitHub, comme d'habitude.

## Notes

- Toutes les données (joueurs, barème, amendes) sont stockées dans une seule ligne JSON de la table `fc_crissier_data` — simple et largement suffisant pour ce volume.
- Le lien Netlify est utilisable par toute l'équipe : tout le monde voit et modifie la même caisse en temps réel (après rafraîchissement de la page).
- Sécurité : les policies SQL fournies sont ouvertes (pas de login). Convient à un lien interne non partagé publiquement. Si besoin de restreindre plus tard, on peut ajouter une authentification Supabase simple.
