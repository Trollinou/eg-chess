import { Chess } from "../vendor/chess.js/chess.js";
import { Chessboard } from "../vendor/cm-chessboard/src/Chessboard.js";
import { MARKER_TYPE, Markers } from "../vendor/cm-chessboard/src/extensions/markers/Markers.js";
import { PromotionDialog } from "../vendor/cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js";
import { Arrows } from "../vendor/cm-chessboard/src/extensions/arrows/Arrows.js";
import { RightClickAnnotator } from "../vendor/cm-chessboard/src/extensions/right-click-annotator/RightClickAnnotator.js";
import { INPUT_EVENT_TYPE } from "../vendor/cm-chessboard/src/Chessboard.js";

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
                { class: RightClickAnnotator }
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
            this.board.setPosition(this.chess.fen(), true);
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
            this.board.setPosition(this.chess.fen(), true);
        }
    }

    inputHandler(event) {
        if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
            const moves = this.chess.moves({ square: event.squareFrom, verbose: true });
            this.board.addLegalMovesMarkers(moves);
            return moves.length > 0;
        } else if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
            const moves = this.chess.moves({ square: event.squareFrom, verbose: true });
            return moves.some(move => move.to === event.squareTo);
        } else if (event.type === INPUT_EVENT_TYPE.moveInputFinished) {
            this.board.removeLegalMovesMarkers();
            if (event.legalMove) {
                const piece = this.chess.get(event.squareFrom);
                const isPromotion = piece && piece.type === 'p' &&
                    ((piece.color === 'w' && event.squareTo[1] === '8') ||
                     (piece.color === 'b' && event.squareTo[1] === '1'));

                if (isPromotion) {
                    this.board.showPromotionDialog(event.squareTo, piece.color, (result) => {
                        if (result) {
                            this.chess.move({
                                from: event.squareFrom,
                                to: event.squareTo,
                                promotion: result.piece.charAt(1)
                            });
                            this.board.setPosition(this.chess.fen());
                            if (this.chess.isGameOver()) {
                                this.emit('onGameOver');
                            }
                        }
                    });
                } else {
                    this.chess.move({ from: event.squareFrom, to: event.squareTo });
                    this.board.setPosition(this.chess.fen());
                    this.emit('onMove', this.chess.fen());
                    if (this.chess.isGameOver()) {
                        this.emit('onGameOver');
                    }
                }
            } else {
                this.board.setPosition(this.chess.fen());
            }
        } else if (event.type === INPUT_EVENT_TYPE.moveInputCanceled) {
            this.board.removeLegalMovesMarkers();
            this.board.setPosition(this.chess.fen());
        }
    }
}
