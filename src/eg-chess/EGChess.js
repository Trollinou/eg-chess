import { Chess } from "../vendor/chess.js/chess.js";
import { Chessboard } from "../vendor/cm-chessboard/src/Chessboard.js";
import { MARKER_TYPE, Markers } from "../vendor/cm-chessboard/src/extensions/markers/Markers.js";
import { PromotionDialog } from "../vendor/cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js";
import { Arrows } from "../vendor/cm-chessboard/src/extensions/arrows/Arrows.js";
import { RightClickAnnotator } from "../vendor/cm-chessboard/src/extensions/right-click-annotator/RightClickAnnotator.js";
import { INPUT_EVENT_TYPE } from "../vendor/cm-chessboard/src/Chessboard.js";
import { Accessibility } from "../vendor/cm-chessboard/src/extensions/accessibility/Accessibility.js";

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
                { class: Markers, props: { autoMarkers: MARKER_TYPE.square } },
                { class: PromotionDialog },
                { class: RightClickAnnotator },
                { class: Accessibility, props: { visuallyHidden: true } }
            ]
        });

        this.board.enableMoveInput(this.inputHandler.bind(this));

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
        this.emit('onMove', this.chess.history({ verbose: true }).pop());
        if (this.chess.isGameOver()) {
            this.emit('onGameOver');
        }
    }

    inputHandler(event) {
        if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
            const moves = this.chess.moves({square: event.square, verbose: true});
            this.board.context.extensions.accessibility.showLegalMoves(moves);
            return moves.length > 0;
        } else if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
            this.board.context.extensions.accessibility.hideLegalMoves();
            const move = {from: event.squareFrom, to: event.squareTo, promotion: event.promotion};
            const result = this.chess.move(move);
            if (result) {
                this.board.state.moveInputProcess.then(() => {
                    this._updateBoard();
                });
            } else {
                const possibleMoves = this.chess.moves({ square: event.squareFrom, verbose: true });
                for (const possibleMove of possibleMoves) {
                    if (possibleMove.promotion && possibleMove.to === event.squareTo) {
                        this.board.showPromotionDialog(event.squareTo, this.chess.turn(), (promoResult) => {
                            if (promoResult && promoResult.piece) {
                                this.chess.move({ from: event.squareFrom, to: event.squareTo, promotion: promoResult.piece.charAt(1) });
                                this._updateBoard();
                            } else {
                                this.board.setPosition(this.chess.fen());
                            }
                        });
                        return true;
                    }
                }
            }
            return result;
        } else if (event.type === INPUT_EVENT_TYPE.moveInputFinished) {
            this.board.context.extensions.accessibility.hideLegalMoves();
        }
    }
}