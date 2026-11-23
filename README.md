# Site NeuroBreizh

Site du cabinet de neuropsychologie NeuroBreizh (Rennes), publié avec GitHub Pages.

## Organisation

| Dossier | Contenu |
|---|---|
| `_src/pages/` | le texte de chaque page (une page = un fichier) |
| `_src/site.json` | les informations du cabinet : noms, adresse, téléphone, tarifs, lien de rendez-vous |
| `_src/games.json` | la liste des jeux affichés sur le site |
| `_src/build.py` | le script qui fabrique les pages publiées à partir des deux dossiers ci-dessus |
| `_src/DESIGN.md` | la direction visuelle (couleurs, typographies, principes) |
| `assets/` | styles, script, polices auto-hébergées, images |
| `jeux/` | les sept jeux cognitifs, un dossier par jeu |

Les fichiers `index.html` des dossiers de pages sont **générés** : on ne les modifie pas à la main.

## Compléter les informations du cabinet

1. Remplir les champs `null` de `_src/site.json`.
2. Lancer `python3 _src/build.py` depuis la racine du dépôt.
3. Les champs encore vides apparaissent sur le site en jaune, entre crochets : il n'en faut plus aucun avant la mise en ligne.

## Mettre en ligne sur un nom de domaine (ex. neurobreizh.fr)

1. Acheter le domaine chez un registraire.
2. Dans `_src/site.json` : `"base_url": "https://neurobreizh.fr"` et `"base_path": "/"`, puis relancer le script.
3. Ajouter un fichier `CNAME` contenant `neurobreizh.fr` à la racine.
4. Chez le registraire, faire pointer le domaine vers GitHub Pages (enregistrements A et CNAME indiqués dans la documentation GitHub Pages).
5. Dans les réglages du dépôt, section Pages : renseigner le domaine et cocher « Enforce HTTPS ».

## Choix techniques

- Aucun cookie, aucun outil de mesure d'audience, aucune police chargée depuis Google : tout est servi par le site.
- Accessibilité vérifiée avec axe-core (WCAG 2.2 AA) sur toutes les pages, en version ordinateur et mobile.
- L'ancienne adresse `go-nogo-game.html` redirige vers `jeux/reflexes-controle/`.
