# EGChess

`EGChess` est une bibliothèque JavaScript ESM qui encapsule [`cm-chessboard`](https://github.com/shaack/cm-chessboard) (pour l'interface utilisateur visuelle) et [`chess.js`](https://github.com/jhlywa/chess.js) (pour la logique du jeu) afin de fournir un composant d'échecs complet avec validation des règles.

## Fonctionnalités

-   Encapsule `cm-chessboard` et `chess.js` dans une seule classe facile à utiliser.
-   Fournit une API simple pour la gestion de l'état du jeu, l'historique des coups et la validation des coups.
-   Inclut des extensions `cm-chessboard` pour les flèches, les marqueurs, les boîtes de dialogue de promotion et l'annotation par clic droit.
-   Processus de build simple utilisant `esbuild` et `sass`.

## Démarrage rapide

### 1. Cloner le dépôt et installer les dépendances

\`\`\`bash
git clone <URL_DU_DÉPÔT>
cd eg-chess
npm install
\`\`\`

### 2. Construire la bibliothèque

Cette commande regroupera le JavaScript, compilera le SASS et copiera tous les actifs nécessaires dans le répertoire `/dist`.

\`\`\`bash
npm run build
\`\`\`

### 3. Lancer le serveur de test

Cette commande démarrera un serveur de développement local et servira la page de test `index.html`.

\`\`\`bash
npm start
\`\`\`

Ouvrez [http://localhost:8080](http://localhost:8080) dans votre navigateur pour voir l'échiquier en action.

## Utilisation

Voici un exemple simple de la façon d'utiliser la bibliothèque `EGChess` :

\`\`\`javascript
import { EGChess } from './dist/eg-chess.js';

// L'élément conteneur pour l'échiquier
const boardContainer = document.getElementById('board-container');

// Créer une nouvelle instance
const egChess = new EGChess(boardContainer);

// S'abonner aux événements
egChess.on('onMove', (move) => {
  console.log('Coup joué:', move);
});

egChess.on('onGameOver', () => {
  console.log('La partie est terminée.');
});
\`\`\`

## API

### Constructeur

\`\`\`javascript
new EGChess(container, mode, [options])
\`\`\`

-   `container` : L'élément HTML dans lequel l'échiquier doit être rendu.
-   `mode` : Le mode de fonctionnement de l'échiquier. Les valeurs possibles sont :
    -   `'build'`: Permet de construire librement une position.
    -   `'match'`: Pour jouer une partie standard (par défaut).
    -   `'analysis'`: Pour analyser une position.
    -   `'train'`: Pour des exercices d'entraînement.
-   `options` (facultatif) : Un objet de configuration. Il peut contenir :
    -   `fen`: Une chaîne FEN pour initialiser l'échiquier avec une position spécifique.

### Mode "Build"

En mode "build", vous pouvez manipuler l'échiquier des manières suivantes :
-   **Ajouter une pièce**: Cliquez sur une case vide pour ouvrir une boîte de dialogue et sélectionner une pièce à ajouter.
-   **Supprimer une pièce**: Double-cliquez sur une pièce pour la retirer de l'échiquier.
-   **Déplacer une pièce**: Faites glisser une pièce d'une case à une autre.
-   **Supprimer une pièce par glisser-déposer**: Faites glisser une pièce en dehors de l'échiquier pour la supprimer.

### Méthodes

-   `getFen()`: Renvoie la représentation FEN de la position actuelle.
-   `reset()`: Réinitialise la partie à la position de départ.
-   `load(fen)`: Charge une nouvelle position FEN sur l'échiquier.
-   `undo()`: Annule le dernier coup.
-   `history()`: Renvoie l'historique des coups.
-   `isCheckmate()`: Renvoie `true` si la position actuelle est un échec et mat.
-   `isDraw()`: Renvoie `true` si la partie est nulle.
-   `isDrawByFiftyMoves()`: Renvoie `true` si la partie est nulle en raison de la règle des cinquante coups.
-   `isInsufficientMaterial()`: Renvoie `true` si la partie est nulle en raison d'un matériel insuffisant.
-   `isGameOver()`: Renvoie `true` si la partie est terminée.
-   `isStalemate()`: Renvoie `true` si la position actuelle est un pat.
-   `isThreefoldRepetition()`: Renvoie `true` si la position actuelle est apparue trois fois.
-   `setTurn(color)`: Définit le camp dont c'est le tour de jouer (`'w'` pour les blancs, `'b'` pour les noirs).

#### Méthodes pour les flèches (Arrows)

-   `addArrows(arrows)`: Ajoute plusieurs flèches à l'échiquier. `arrows` est un tableau d'objets, chacun avec `from`, `to` et `type`.
-   `getArrows()`: Renvoie toutes les flèches actuellement sur l'échiquier.
-   `removeArrows()`: Supprime toutes les flèches de l'échiquier.

#### Méthodes pour les marqueurs (Markers)

-   `addMarkers(markers)`: Ajoute plusieurs marqueurs à l'échiquier. `markers` est un tableau d'objets, chacun avec `square` et `type`.
-   `getMarkers()`: Renvoie tous les marqueurs actuellement sur l'échiquier.
-   `removeMarkers()`: Supprime tous les marqueurs de l'échiquier.

### Événements

-   `on(eventName, callback)`: S'abonne à un événement.
    -   `'onMove'`: Se déclenche après qu'un coup valide a été joué. Le `callback` reçoit la FEN de la nouvelle position.
    -   `'onGameOver'`: Se déclenche lorsque la partie est terminée (échec et mat, pat, nulle).
    -   `'onChange'`: **(Mode "build" uniquement)** Se déclenche chaque fois que la position de l'échiquier est modifiée. Le `callback` reçoit la FEN de la nouvelle position.

## Licence

MIT
