# Matéo et les Nombres

Jeu de plateforme 2D où il faut calculer pour avancer. Il tourne dans le navigateur, sur ordinateur, tablette et téléphone, et peut s'installer comme une application (PWA).

## Jouer

- Ouvrir `index.html` dans un navigateur, **ou** servir le dossier pour pouvoir installer l'application :
  ```bash
  python3 -m http.server 8000
  # puis ouvrir http://localhost:8000
  ```
- Sur mobile ou dans Chrome/Edge : menu « Installer l'application » / « Ajouter à l'écran d'accueil ».

## Commandes

| Action | Clavier | Tactile |
|---|---|---|
| Bouger | ← → ou Q D | ◀ ▶ |
| Sauter | Espace, ↑ ou Z | ⤒ |
| Courir | Maj | » |
| Répondre | 1 2 3 4 ou clic | toucher |
| Pause | Échap ou P | ❚❚ |

## Principe

- **Blocs à symbole** (+ − × ÷) : tape-les par dessous pour obtenir une question. Bonne réponse = pièce et points.
- **Portes du Savoir** (violettes) : elles bloquent le chemin et ne s'ouvrent qu'avec la bonne réponse (nombre manquant, priorités opératoires…).
- 3 bonnes réponses d'affilée = +1 ❤. Réponse rapide (moins de 6 s) = bonus ⚡.
- 100 pièces = +1 vie. Écrase les monstres en sautant dessus.
- 3 difficultés : Facile (CP–CE2), Moyen (CM1–CM2), Difficile (collège).
- 8 mondes : additions, soustractions, multiplications, divisions, puis mélanges.
- Les mondes débloqués et le meilleur score sont enregistrés dans le navigateur.

## Fichiers

- `index.html` : page et interface
- `style.css` : styles
- `game.js` : moteur du jeu, niveaux, questions
- `manifest.webmanifest`, `sw.js`, `icon.svg` : installation hors ligne (PWA)
