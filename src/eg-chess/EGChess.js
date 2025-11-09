import { Chess } from "../vendor/chess.js/chess.js";
import { Chessboard } from "../vendor/cm-chessboard/src/Chessboard.js";
import { MARKER_TYPE, Markers } from "../vendor/cm-chessboard/src/extensions/markers/Markers.js";
import { PromotionDialog } from "../vendor/cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js";
import { Arrows } from "../vendor/cm-chessboard/src/extensions/arrows/Arrows.js";
import { RightClickAnnotator } from "../vendor/cm-chessboard/src/extensions/right-click-annotator/RightClickAnnotator.js";

export class EGChess {
    constructor(container, config = {}) {
        this.chess = new Chess(config.fen);
        const defaultConfig = {
            assetsUrl: './dist/assets/'
        };
        const finalConfig = { ...defaultConfig, ...config };

        this.board = new Chessboard(container, {
            position: this.chess.fen(),
            assetsUrl: finalConfig.assetsUrl,
            extensions: [
                { class: Arrows },
                { class: Markers },
                { class: PromotionDialog },
                { class: RightClickAnnotator }
            ]
        });

        this.board.enableMoveInput((event) => {
            switch (event.type) {
                case 'moveInputStarted':
                    return true;
                case 'validateMoveInput':
                    const move = {
                        from: event.squareFrom,
                        to: event.squareTo
                    };
                    const possibleMoves = this.chess.moves({ square: event.squareFrom, verbose: true });
                    const possibleMove = possibleMoves.find(m => m.to === event.squareTo);
                    if (possibleMove && possibleMove.flags.includes('p')) {
                        this.board.showPromotionDialog(event.squareTo, this.chess.turn(), (result) => {
                            if (result && result.piece) {
                                move.promotion = result.piece.charAt(1);
                                const moveResult = this.chess.move(move);
                                if (moveResult) {
                                    this.board.setPosition(this.chess.fen());
                                    this.emit('onMove', moveResult);
                                    if (this.chess.isGameOver()) {
                                        this.emit('onGameOver');
                                    }
                                }
                            } else {
                                // Promotion canceled
                                this.board.setPosition(this.chess.fen());
                            }
                        });
                        return false; // The move is handled asynchronously
                    } else {
                        const result = this.chess.move(move);
                        if (result) {
                            this.board.setPosition(this.chess.fen());
                            this.emit('onMove', result);
                            if (this.chess.isGameOver()) {
                                this.emit('onGameOver');
                            }
                            return true;
                        }
                    }
                    return false;
            }
        });

        this.listeners = {};
    }

    on(eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);
    }

    emit(eventName, data) {
        if (this.listeners[eventName]) {
            this.listeners[eventName].forEach(callback => callback(data));
        }
    }

    getFen() {
        return this.chess.fen();
    }

    reset() {
        this.chess.reset();
        this.board.setPosition(this.chess.fen());
    }

    load(fen) {
        if (this.chess.load(fen)) {
            this._updateBoard();
        }
    }

    undo() {
        this.chess.undo();
        this.board.setPosition(this.chess.fen());
    }

    history() {
        return this.chess.history();
    }

    isCheckmate() {
        return this.chess.isCheckmate();
    }

    isDraw() {
        return this.chess.isDraw();
    }

    isDrawByFiftyMoves() {
        return this.chess.isDrawByFiftyMoves();
    }

    isInsufficientMaterial() {
        return this.chess.isInsufficientMaterial();
    }

    isGameOver() {
        return this.chess.isGameOver();
    }

    isStalemate() {
        return this.chess.isStalemate();
    }

    isThreefoldRepetition() {
        return this.chess.isThreefoldRepetition();
    }

    setTurn(color) {
        const fen = this.chess.fen();
        const tokens = fen.split(" ");
        tokens[1] = color;
        if (this.chess.load(tokens.join(" "))) {
            this._updateBoard();
        }
    }

    _updateBoard() {
        this.board.setPosition(this.chess.fen());
    }
}