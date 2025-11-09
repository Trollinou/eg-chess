# Guide du projet EGChess pour les agents

Ce document fournit des instructions et des directives pour travailler sur la bibliothèque EGChess.

## Aperçu du projet

L'objectif principal de ce projet est de créer `EGChess`, une bibliothèque JavaScript ESM qui encapsule `cm-chessboard` (pour l'interface utilisateur visuelle) et `chess.js` (pour la logique du jeu). Cette bibliothèque est destinée à être utilisée dans une extension WordPress pour l'apprentissage des échecs.

## Structure du projet

-   `/src` : Contient tout le code source.
    -   `/src/eg-chess` : Le fichier principal de la bibliothèque `EGChess.js`.
    -   `/src/scss` : Fichiers SASS pour le style. `eg-chess.scss` est le point d'entrée principal.
    -   `/src/vendor` : Contient les bibliothèques tierces `cm-chessboard` et `chess.js`.
-   `/dist` : Contient les fichiers de sortie compilés et groupés, prêts à être distribués.
-   `/index.html` : Une page de test simple pour démontrer et vérifier les fonctionnalités de la bibliothèque.
-   `package.json` : Définit les métadonnées du projet, les dépendances et les scripts de build.

## Processus de build

Le projet utilise des scripts `npm` pour son processus de build, en s'appuyant sur `esbuild` pour le regroupement JavaScript et `sass` pour la compilation SASS.

-   **`npm run build`** : C'est la commande de build principale. Elle effectue les étapes suivantes :
    1.  **`build:js`** : Regroupe `/src/eg-chess/EGChess.js` dans `/dist/eg-chess.js` à l'aide d'`esbuild`.
    2.  **`build:css`** : Compile `/src/scss/eg-chess.scss` dans `/dist/eg-chess.css` à l'aide de `sass`.
    3.  **`copy:assets`** : Copie tous les actifs (sprites SVG, styles, etc.) de `/src/vendor/cm-chessboard/assets/` dans `/dist/assets/` à l'aide de `cpx` pour la compatibilité multiplateforme.

-   **`npm start`** : Démarre un serveur de développement local à l'aide de `http-server` pour servir la racine du projet. Ceci est essentiel pour les tests, car le chargement de la bibliothèque directement depuis le système de fichiers (`file://`) est bloqué par les politiques CORS du navigateur.

## Dépendances clés et configuration

### cm-chessboard

-   **Configuration des actifs** : `cm-chessboard` doit savoir où se trouvent ses actifs (sprites de pièces, SVG d'extensions). Ceci est configuré dans le constructeur `EGChess.js` via la propriété `assetsUrl`. Elle doit pointer vers le répertoire où les actifs sont servis, par rapport à la page `index.html`.
    -   *Configuration correcte* : `assetsUrl: './dist/assets/'`

-   **Style** : Le fichier SASS situé dans `/src/scss/eg-chess.scss` importe la feuille de style principale de `cm-chessboard` située dans `/src/vendor/cm-chessboard/assets/chessboard.scss`. N'importez pas le fichier CSS précompilé.

### chess.js

-   Cette bibliothèque gère toute la logique du jeu. La classe `EGChess` crée une instance de `Chess` et encapsule ses méthodes (`move`, `load`, `fen`, `isGameOver`, etc.).
-   Lors de la mise à jour de l'état du jeu via les méthodes de `chess.js` (par exemple, `load`, `undo`, `setTurn`), vous **devez** également mettre à jour l'échiquier visuel en appelant `this.board.setPosition(this.chess.fen())`. Une méthode d'assistance privée `_updateBoard()` est utilisée à cet effet.

## Flux de travail de développement

1.  Apportez des modifications aux fichiers sources dans `/src`.
2.  Exécutez `npm run build` pour compiler les modifications dans le répertoire `/dist`.
3.  Exécutez `npm start` pour démarrer le serveur de développement local.
4.  Ouvrez `http://localhost:8080` dans votre navigateur pour afficher `index.html` et tester vos modifications.

## Processus de vérification (pré-commit)

Si vos modifications affectent l'interface utilisateur, vous devez effectuer une vérification du frontend à l'aide de Playwright.

1.  Créez un répertoire temporaire pour vos scripts de vérification (par exemple, `/tmp/verification`).
2.  Créez un script de vérification Playwright (par exemple, `/tmp/verification/verify.py`).
3.  Ce script doit démarrer le serveur (`npm start`), naviguer jusqu'à `index.html` et prendre une capture d'écran.
4.  Exécutez-le avec `python /tmp/verification/verify.py`.
5.  Inspectez la capture d'écran générée (par exemple, `/tmp/verification/screenshot.png`) à l'aide de `read_image_file` pour vous assurer que l'interface utilisateur semble correcte.
6.  Si tout est correct, terminez la vérification avec `frontend_verification_complete`.
