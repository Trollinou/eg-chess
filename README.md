# eg-chess

Bibliothèque JavaScript ESM encapsulant cm-chessboard (8.10.1) et chess.js (1.4.0) pour faciliter la manipulation d'un échiquier avec validation des règles.

## Installation

\`\`\`bash
npm install eg-chess
\`\`\`

## Utilisation

\`\`\`javascript
import { EGChess } from 'eg-chess';
import 'eg-chess/styles';

const chess = new EGChess('#board', {
  assetsUrl: './node_modules/cm-chessboard/assets/'
});

chess.onMove((move) => {
  console.log('Coup joué:', move);
});

chess.onCheckmate(() => {
  alert('Échec et mat!');
});
\`\`\`

## API

### Constructeur

\`\`\`javascript
new EGChess(container, options)
\`\`\`

### Méthodes principales

- \`move(move)\` - Jouer un coup
- \`undo()\` - Annuler le dernier coup
- \`reset()\` - Nouvelle partie
- \`load(fen)\` - Charger une position FEN
- \`fen()\` - Obtenir la position FEN
- \`pgn()\` - Obtenir la notation PGN

### Callbacks

- \`onMove(callback)\`
- \`onCheck(callback)\`
- \`onCheckmate(callback)\`
- \`onDraw(callback)\`
- \`onGameOver(callback)\`

## Licence

MIT
