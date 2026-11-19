# Rentway Reskin — CaribeCar (v2.0.0)

Extension Chrome qui rend Rentway plus lisible et plus confortable **sans rien changer à son fonctionnement**, sur ses deux applications :

- **Rentway v1** (`rentwayv1.emotionmobility.com`) : réservations et contrats de location ;
- **Rentway Pro** (`rentway.emotionmobility.com`) : tableau de bord, caisse, flotte, tarifs, facturation, rapports, paramétrage.

Elle restyle les éléments existants et ajoute ses propres repères visuels, mais ne remplace aucun bouton ni champ de Rentway. Toutes les actions (édition, sauvegarde, navigation, paiements…) restent celles de Rentway.

## Ce que fait l'extension

### Sur Rentway v1

- Barre de résumé de la réservation en haut de l'écran (dates, agences, durée, catégorie, solde).
- Titre, actions et onglets regroupés dans un en-tête fixe qui reste visible au défilement.
- Onglets libellés, alignés à gauche ; actions principales (Éditer, Sauvegarder) mises en avant.
- Raccourcis **Alt + 1 … 0** pour changer d'onglet.
- Grille d'espacement « nombre d'or » base 9 px (3 · 6 · 9 · 15 · 24 · 38 · 62).
- Suppression du voile noir clignotant pendant les chargements, remplacé par une fine barre de progression. Le voile reste actif en arrière-plan pour bloquer les clics pendant le chargement.
- Infobulles repositionnées sous les boutons.
- Champs vides atténués, prix arrondis à 2 décimales dans le résumé.
- **Champs à saisir en premier** mis en évidence (cadre bleu) tant qu'ils sont vides et modifiables : « Réservation nr. », « Contrat nr. », « Code impro ». Sur une nouvelle réservation, un nouveau contrat ou une impro, Rentway ne charge le reste de l'écran qu'une fois l'un d'eux rempli. Le cadre disparaît dès la première saisie ; jamais sur un champ verrouillé ni dans une fenêtre de recherche. Sur un nouvel écran (tous ces champs vides), le curseur se place directement dans le premier : on peut taper tout de suite. Une seule fois par écran, jamais pendant un chargement ou avec une fenêtre ouverte, jamais sur une fiche existante, et jamais s'il est déjà dans un autre champ.
- Fenêtres (modales) Rentway : fermeture avec la touche **Échap** ou un **clic à l'extérieur**. L'extension clique simplement sur le bouton de fermeture de la fenêtre : Rentway exécute exactement la même action qu'un clic manuel. Rien ne se passe si une liste déroulante ou un calendrier est ouvert, si une cellule de tableau est en cours d'édition ou pendant un chargement.
- En-tête des fenêtres épuré (blanc) ; il ne recouvre plus les en-têtes de colonnes (ex. tableau de bord → Pré-Clos).

### Sur Rentway Pro

Rentway Pro a déjà un en-tête fixe, des onglets et des boutons libellés : l'extension n'y refait pas le design, elle ajoute le confort.

- **Chargement discret** : le voile blanc qui fait « clignoter » la page à chaque changement d'onglet ou d'écran devient transparent (il bloque toujours les clics pendant le chargement) ; une fine barre de progression s'affiche sous l'en-tête, seulement si le chargement dépasse 300 ms.
- **Raccourcis Alt + 1 … 0** pour changer d'onglet (ex. fiche véhicule : Alt + 8 = « Fines », même s'il est coupé à droite). Dans une fenêtre ouverte, ils pilotent les onglets de la fenêtre. Ctrl + K (recherche de Rentway) reste inchangé.
- **Infobulles** : nom des boutons qui n'ont qu'une icône (ex. l'œil = « Voir le détail »), texte complet des cellules de tableau et des tuiles coupées par « … », raccourci Alt + N sur les onglets.
- **Fermer les fenêtres** avec Échap ou un clic à l'extérieur, **en secours seulement** : Rentway Pro le fait souvent déjà ; l'extension n'intervient que si la fenêtre est toujours ouverte un instant après, en cliquant sur son propre bouton de fermeture. Jamais sur une fenêtre de confirmation (ex. « Supprimer ? »).
- **Retouches** (réglage « Nouveau design ») : onglets qui débordent signalés par un fondu et défilables à la molette ; sur le tableau de bord, seules les lignes cliquables ressemblent à des liens ; champs vides atténués en consultation (jamais en édition) ; tableaux du tableau de bord (ex. Return RA) sur toute la hauteur de l'écran.
- Bouton **« Améliorations : ON/OFF »** en bas à gauche, à droite du menu latéral.

L'écran de démarrage (`/company-selector`) et la connexion ne sont jamais modifiés.

## Nouveautés v2.0.0

- Prise en charge de **Rentway Pro**, en plus de Rentway v1 (inchangé).
- Réglages **communs aux deux applications** : un changement dans le popup s'applique à tous les onglets Rentway ouverts, v1 et Pro. « Rentway d'origine » désactive tout partout.
- Le popup reconnaît l'application de l'onglet et adapte ses libellés (la barre de résumé est propre à v1).
- Les réglages choisis en v1.1 sont repris automatiquement.
- Rentway v1 : champs à saisir en premier (Réservation nr., Contrat nr., Code impro) mis en évidence tant qu'ils sont vides, curseur placé dans le premier sur un nouvel écran.

## Installation (test sur un poste)

Mise à jour depuis la v1.x : remplacer les fichiers du dossier `rentway-reskin` (garder le dossier `icons` ; deux nouveaux fichiers, `pro.js` et `pro.css`), puis cliquer ↻ sur l'extension dans `chrome://extensions` et recharger les onglets Rentway (v1 et Pro). La v2.0.0 demande la permission `storage` (réglages partagés) : Chrome n'affiche aucun avertissement pour celle-ci.

Première installation :

1. Décompresser `rentway-reskin.zip`.
2. Ouvrir `chrome://extensions` dans Chrome.
3. Activer **Mode développeur** (en haut à droite).
4. Cliquer **Charger l'extension non empaquetée** et sélectionner le dossier `rentway-reskin`.
5. Recharger les onglets Rentway.

Le dossier `test/` sert au développement ; il n'est pas nécessaire au fonctionnement de l'extension.

## Réglages

Icône de l'extension dans la barre Chrome → chaque fonction s'active séparément. Les réglages valent pour les deux applications.

| Réglage | Rentway v1 | Rentway Pro |
|---|---|---|
| Nouveau design | En-tête fixe, onglets libellés, cartes, fenêtres, champs à saisir en premier | Retouches : onglets qui débordent, tableau de bord, champs vides, hauteur des tableaux |
| ↳ Barre de résumé | Bandeau de la réservation (nécessite le nouveau design) | — (Rentway v1 uniquement) |
| Infobulles | Infobulles sous le bouton au lieu de le masquer | Boutons icônes, textes tronqués, raccourcis des onglets |
| Bouton ON/OFF à l'écran | Bouton « Nouveau design » en bas à gauche | Bouton « Améliorations » en bas à gauche, à droite du menu |
| Chargement discret | Fine barre au lieu du voile noir clignotant | Fine barre au lieu du voile blanc |
| Fermer les fenêtres | Touche Échap ou clic à l'extérieur | Idem, en secours quand Rentway Pro ne le fait pas |
| Raccourcis clavier | Alt + 1…0 pour changer d'onglet | Alt + 1…0 pour changer d'onglet |

Boutons rapides : **Tout activer** et **Rentway d'origine** (tout désactivé sur v1 et Pro, utile lors d'un appel au support Emotion Mobility).
Exemple : pour n'avoir que le nouvel écran de chargement, désactiver « Nouveau design » et garder « Chargement discret ».

Le bouton à l'écran bascule uniquement le design. Les réglages sont mémorisés sur le poste et appliqués à tous les onglets Rentway ouverts, sans recharger.

## Confidentialité et sécurité

- S'exécute **uniquement** sur `https://rentwayv1.emotionmobility.com/*` et `https://rentway.emotionmobility.com/*` (jamais sur la page de connexion `identity.emotionmobility.com`).
- Une seule permission, `storage`, pour partager les réglages entre les deux applications. Aucun appel réseau, aucune donnée envoyée hors du navigateur.
- Seule donnée stockée : les réglages (`chrome.storage.local`, clé `rwSettings`, avec une copie dans le `localStorage` de chaque site pour les appliquer dès l'affichage). L'ancienne préférence `rwReskin` de la v1.0 et les réglages de la v1.1 sont repris automatiquement.

## Maintenance

Quand Rentway publie une mise à jour, certains éléments peuvent changer de nom. L'extension s'appuie sur des repères stables et jamais sur les identifiants techniques générés à chaque version. Si un élément n'est plus reconnu, il retrouve simplement son apparence Rentway d'origine : aucune fonction n'est bloquée.

- **Rentway v1** (Vue 2 + Vuetify) : libellés des champs, classes Vuetify, icônes `mdi-*`.
- **Rentway Pro** (Vue 3 + DevExtreme) : classes des composants (`rw-*`, `dx-*`), icônes (`mdi-*`, `dx-icon-*`) et adresses des écrans ; **jamais le texte affiché** (il suit la langue de l'utilisateur) ni les attributs `data-v-*` (ils changent à chaque version). Tout ce que l'extension ajoute sur Pro est préfixé `rwr-` : Pro utilise déjà `rw-` pour ses propres composants.
- Après chaque mise à jour de Rentway Pro (version affichée en bas du menu latéral, ex. « v5.26 ») : coller `test/pro-healthcheck.js` dans la console (F12) sur une fiche véhicule et sur la caisse. Il ne modifie rien et indique les repères qui ne correspondent plus.

Fichiers :

| Fichier | Rôle |
|---|---|
| `manifest.json` | Déclaration de l'extension (Manifest V3) |
| `early.js` | Commun aux deux applications : réglages partagés, appliqués dès le début du chargement (évite tout flash), échanges avec le popup |
| `styles.css` | Style Rentway v1, chaque règle limitée à la classe de sa fonction (`rw-on`, `rw-sum`, `rw-calm`, `rw-tips`, `rw-btn`) |
| `content.js` | Rentway v1 : libellés, barre de résumé, raccourcis, chargement, infobulles, fermeture des fenêtres |
| `pro.css` | Style Rentway Pro, chaque règle limitée à la classe de sa fonction (`rwr-design`, `rwr-calm`, `rwr-tips`, `rwr-btn`) et aux écrans de l'application (`rwr-app`) |
| `pro.js` | Rentway Pro : suivi des écrans, chargement, raccourcis, infobulles, fermeture des fenêtres, retouches, bouton |
| `popup.html` / `popup.js` | Réglages dans la barre Chrome |
| `test/` | Développement uniquement : page d'essai Rentway Pro, copie de dev, contrôle des repères (voir `test/README.md`) |
