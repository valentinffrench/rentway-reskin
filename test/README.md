# test/ — développement Rentway Pro (jamais livré)

Rentway Pro exige une connexion : on développe sur une page d'essai locale qui reproduit son balisage (Pro v5.26) et les comportements dont dépend l'extension. Toutes les données y sont inventées.

| Fichier | Rôle |
|---|---|
| `pro-fixture.html` | Page d'essai : coque Pro (menu latéral, bandeau, en-tête, conteneur de défilement), fiche véhicule (tuiles, 8 onglets, champs en consultation / édition), tableau de bord, tableau « Return RA » (400 px), fenêtres. Écran de démarrage `/company-selector` à chaque chargement complet, voile de chargement sur chaque onglet / écran. Le bandeau jaune simule des chargements (200 ms, 800 ms, 2 s) et ouvre « What's new? » (se ferme seule sur Échap, comme Pro), une fenêtre qui ignore Échap, et une confirmation. |
| `serve.mjs` | Sert la page d'essai à toutes les adresses, comme Pro : `node test/serve.mjs` puis `http://localhost:8765/subscriptions/demo/vehicle-details/1001` |
| `dev-extension.mjs` | Fabrique une **copie de dev** de l'extension qui tourne aussi sur `http://localhost:8765/*` (traité comme Pro) : `node test/dev-extension.mjs` → dossier `../rentway-reskin-dev`, à charger dans `chrome://extensions` (Charger l'extension non empaquetée). Le vrai `manifest.json` n'est jamais modifié ; ne jamais diffuser cette copie. |
| `pro-healthcheck.js` | Contrôle des repères à coller dans la console sur le vrai Rentway Pro, après chaque mise à jour de Pro. Ne modifie rien. |

Après une modification de `pro.js` / `pro.css` : relancer `dev-extension.mjs`, cliquer ↻ sur la copie de dev dans `chrome://extensions`, recharger la page d'essai.

Écrans : `…/vehicle-details/1001`, `…/dashboard`, `…/dashboard/rental-agreements` (ou via le menu latéral).
