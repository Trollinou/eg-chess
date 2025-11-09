import * as esbuild from 'esbuild';
import { writeFileSync } from 'fs';

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/index.js',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  minify: !isWatch,
  external: [], // Tout est bundlé
  banner: {
    js: `/**
 * eg-chess v1.0.0
 * Bibliothèque JavaScript ESM encapsulant cm-chessboard et chess.js (sources locales)
 * @license MIT
 */`
  }
};

// Génération des types TypeScript (.d.ts)
const generateTypes = () => {
  const types = `/**
 * eg-chess - Type Definitions
 */

import { Chess } from './vendor/chess.js/chess.js';
import { Chessboard, FEN, INPUT_EVENT_TYPE, COLOR, BORDER_TYPE } from './vendor/cm-chessboard/Chessboard.js';

export interface EGChessOptions {
  position?: string;
  assetsUrl?: string;
  draggable?: boolean;
  chessboardConfig?: any;
}

export class EGChess {
  constructor(container: HTMLElement | string, options?: EGChessOptions);
  
  enableMoveInput(): void;
  disableMoveInput(): void;
  move(move: string | object): object | null;
  undo(): object | null;
  reset(): void;
  load(fen: string): boolean;
  fen(): string;
  pgn(): string;
  history(options?: object): Array<any>;
  moves(options?: object): Array<any>;
  isGameOver(): boolean;
  isCheck(): boolean;
  isCheckmate(): boolean;
  isDraw(): boolean;
  turn(): string;
  
  onMove(callback: (move: any) => void): void;
  onCheck(callback: () => void): void;
  onCheckmate(callback: () => void): void;
  onDraw(callback: () => void): void;
  onGameOver(callback: () => void): void;
  
  getGame(): Chess;
  getBoard(): Chessboard;
  destroy(): void;
}
`;
  writeFileSync('dist/index.d.ts', types);
};

async function build() {
  try {
    if (isWatch) {
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log('👀 Mode watch activé...');
    } else {
      await esbuild.build(buildOptions);
      generateTypes();
      console.log('✅ Build terminé avec succès!');
    }
  } catch (error) {
    console.error('❌ Erreur lors du build:', error);
    process.exit(1);
  }
}

build();
