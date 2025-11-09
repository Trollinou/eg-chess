import { Chessboard, FEN, INPUT_EVENT_TYPE, COLOR, BORDER_TYPE } from './vendor/cm-chessboard/Chessboard.js';
import { Chess } from './vendor/chess.js/chess.js';

/**
 * Classe EGChess encapsulant cm-chessboard et chess.js
 */
export class EGChess {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('Container invalide pour EGChess');

    this.game = new Chess(options.position || FEN.start);

    const defaultConfig = {
      position: this.game.fen(),
      assetsUrl: options.assetsUrl || './src/vendor/cm-chessboard/assets/',
      style: { cssClass: 'default' },
      ...options.chessboardConfig
    };

    this.board = new Chessboard(this.container, defaultConfig);

    if (options.draggable !== false) {
      this.enableMoveInput();
    }

    this.onMoveCallback = null;
    this.onCheckCallback = null;
    this.onCheckmateCallback = null;
    this.onDrawCallback = null;
    this.onGameOverCallback = null;
  }

  enableMoveInput() {
    this.board.enableMoveInput((event) => this._handleMoveInput(event));
  }

  disableMoveInput() {
    this.board.disableMoveInput();
  }

  _handleMoveInput(event) {
    switch (event.type) {
      case INPUT_EVENT_TYPE.moveInputStarted:
        return this._onMoveInputStarted(event);
      case INPUT_EVENT_TYPE.validateMoveInput:
        return this._onValidateMoveInput(event);
      case INPUT_EVENT_TYPE.moveInputCanceled:
        return true;
    }
  }

  _onMoveInputStarted(event) {
    const moves = this.game.moves({ square: event.square, verbose: true });
    return moves.length > 0;
  }

  _onValidateMoveInput(event) {
    const move = { from: event.squareFrom, to: event.squareTo, promotion: 'q' };
    try {
      const result = this.game.move(move);
      if (result) {
        this.board.setPosition(this.game.fen(), true);
        this._triggerCallbacks();
        return true;
      }
    } catch (e) {
      console.warn('Coup illégal:', e);
    }
    return false;
  }

  _triggerCallbacks() {
    if (this.onMoveCallback) this.onMoveCallback(this.game.history({ verbose: true }).pop());
    if (this.game.isCheck() && this.onCheckCallback) this.onCheckCallback();
    if (this.game.isCheckmate() && this.onCheckmateCallback) this.onCheckmateCallback();
    if (this.game.isDraw() && this.onDrawCallback) this.onDrawCallback();
    if (this.game.isGameOver() && this.onGameOverCallback) this.onGameOverCallback();
  }

  move(move) {
    try {
      const result = this.game.move(move);
      if (result) {
        this.board.setPosition(this.game.fen(), true);
        this._triggerCallbacks();
      }
      return result;
    } catch (e) {
      console.error('Erreur lors du coup:', e);
      return null;
    }
  }

  undo() {
    const move = this.game.undo();
    if (move) this.board.setPosition(this.game.fen(), true);
    return move;
  }

  reset() {
    this.game.reset();
    this.board.setPosition(this.game.fen(), true);
  }

  load(fen) {
    try {
      this.game.load(fen);
      this.board.setPosition(fen, false);
      return true;
    } catch {
      return false;
    }
  }

  fen() {
    return this.game.fen();
  }

  pgn() {
    return this.game.pgn();
  }

  history(options) {
    return this.game.history(options);
  }

  moves(options) {
    return this.game.moves(options);
  }

  isGameOver() {
    return this.game.isGameOver();
  }

  isCheck() {
    return this.game.isCheck();
  }

  isCheckmate() {
    return this.game.isCheckmate();
  }

  isDraw() {
    return this.game.isDraw();
  }

  turn() {
    return this.game.turn();
  }

  onMove(cb) { this.onMoveCallback = cb; }
  onCheck(cb) { this.onCheckCallback = cb; }
  onCheckmate(cb) { this.onCheckmateCallback = cb; }
  onDraw(cb) { this.onDrawCallback = cb; }
  onGameOver(cb) { this.onGameOverCallback = cb; }

  getGame() { return this.game; }
  getBoard() { return this.board; }
  destroy() { this.board.destroy(); }
}
