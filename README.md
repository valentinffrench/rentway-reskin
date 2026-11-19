# Rentway Reskin — CaribeCar (v1.1.0)

Extension Chrome qui modernise l'interface de Rentway (`rentwayv1.emotionmobility.com`) **sans rien changer à son fonctionnement** : elle restyle les éléments existants et ajoute ses propres repères visuels, mais ne remplace aucun bouton ni champ de Rentway. Toutes les actions (édition, sauvegarde, navigation, paiements…) restent celles de Rentway.

## Ce que fait l'extension

- Barre de résumé de la réservation en haut de l'écran (dates, agences, durée, catégorie, solde).
- Titre, actions et onglets regroupés dans un en-tête fixe qui reste visible au défilement.
- Onglets libellés, alignés à gauche ; actions principales (Éditer, Sauvegarder) mises en avant.
- Raccourcis **Alt + 1 … 0** pour changer d'onglet.
- Grille d'espacement « nombre d'or » base 9 px (3 · 6 · 9 · 15 · 24 · 38 · 62).
- Suppression du voile noir clignotant pendant les chargements, remplacé par une fine barre de progression. Le voile reste actif en arrière-plan pour bloquer les clics pendant le chargement.
- Infobulles repositionnées sous les boutons.
- Champs vides atténués, prix arrondis à 2 décimales dans le résumé.
- Fenêtres (modales) Rentway : fermeture avec la touche **Échap** ou un **clic à l'extérieur**. L'extension clique simplement sur le bouton de fermeture de la fenêtre : Rentway exécute exactement la même action qu'un clic manuel. Rien ne se passe si une liste déroulante ou un calendrier est ouvert, si une cellule de tableau est en cours d'édition ou pendant un chargement.
- En-tête des fenêtres épuré (blanc) ; il ne recouvre plus les en-têtes de colonnes (ex. tableau de bord → Pré-Clos).

## Nouveautés v1.1.0

- Fermeture des fenêtres par Échap / clic extérieur.
- Correctif : l'en-tête de la fenêtre « Pré-Clos » masquait les titres de colonnes.
- Réglages par fonction dans l'icône de l'extension (ex. garder seulement le chargement discret sans le nouveau design).

## Installation (test sur un poste)

Mise à jour depuis la v1.0 : remplacer les fichiers du dossier `rentway-reskin` (garder le dossier `icons`), puis cliquer ↻ sur l'extension dans `chrome://extensions` et recharger l'onglet Rentway.

Première installation :

1. Décompresser `rentway-reskin.zip`.
2. Ouvrir `chrome://extensions` dans Chrome.
3. Activer **Mode développeur** (en haut à droite).
4. Cliquer **Charger l'extension non empaquetée** et sélectionner le dossier `rentway-reskin`.
5. Recharger l'onglet Rentway.

## Réglages

Icône de l'extension dans la barre Chrome → chaque fonction s'active séparément :

| Réglage | Effet |
|---|---|
| Nouveau design | En-tête fixe, onglets libellés, cartes, fenêtres |
| ↳ Barre de résumé | Bandeau de la réservation (nécessite le nouveau design) |
| Infobulles repositionnées | Infobulles sous le bouton au lieu de le masquer |
| Bouton ON/OFF à l'écran | Bouton « Nouveau design » en bas à gauche |
| Chargement discret | Fine barre de progression au lieu du voile noir clignotant |
| Fermer les fenêtres | Touche Échap ou clic à l'extérieur |
| Raccourcis clavier | Alt + 1…0 pour changer d'onglet |

Boutons rapides : **Tout activer** et **Rentway d'origine** (tout désactivé, utile lors d'un appel au support Emotion Mobility).
Exemple : pour n'avoir que le nouvel écran de chargement, désactiver « Nouveau design » et garder « Chargement discret ».

Le bouton **« Nouveau design : ON/OFF »** à l'écran bascule uniquement le design. Les réglages sont mémorisés sur le poste et appliqués à tous les onglets Rentway ouverts.

## Confidentialité et sécurité

- S'exécute **uniquement** sur `https://rentwayv1.emotionmobility.com/*`.
- Aucune permission supplémentaire, aucun appel réseau, aucune donnée envoyée hors du navigateur.
- Seule donnée stockée : les réglages (`localStorage`, clé `rwSettings`). L'ancienne préférence `rwReskin` de la v1.0 est reprise automatiquement.

## Maintenance

Quand Rentway publie une mise à jour, certains éléments peuvent changer de nom. L'extension s'appuie sur des repères stables (libellés des champs, classes Vuetify, icônes) et jamais sur les identifiants techniques générés à chaque version. Si un élément n'est plus reconnu, il retrouve simplement son apparence Rentway d'origine : aucune fonction n'est bloquée.

Fichiers :

| Fichier | Rôle |
|---|---|
| `manifest.json` | Déclaration de l'extension (Manifest V3) |
| `early.js` | Charge les réglages et les applique dès le début du chargement (évite tout flash) |
| `styles.css` | Tout le style, chaque règle limitée à la classe de sa fonction (`rw-on`, `rw-sum`, `rw-calm`, `rw-tips`, `rw-btn`) |
| `content.js` | Réglages, libellés, barre de résumé, raccourcis, chargement, infobulles, fermeture des fenêtres |
| `popup.html` / `popup.js` | Réglages dans la barre Chrome |
