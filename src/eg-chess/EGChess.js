import { Chess } from "../vendor/chess.js/chess.js";
import { Chessboard, FEN } from "../vendor/cm-chessboard/src/Chessboard.js";
import { MARKER_TYPE, Markers } from "../vendor/cm-chessboard/src/extensions/markers/Markers.js";
import { PromotionDialog } from "../vendor/cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js";
import { Arrows } from "../vendor/cm-chessboard/src/extensions/arrows/Arrows.js";
import { RightClickAnnotator } from "../vendor/cm-chessboard/src/extensions/right-click-annotator/RightClickAnnotator.js";
import { PieceSelectionDialog, PIECE_SELECTION_DIALOG_RESULT_TYPE } from "./extensions/PieceSelectionDialog.js";
import { INPUT_EVENT_TYPE } from "../vendor/cm-chessboard/src/Chessboard.js";

export class EGChess {
    constructor(container, mode, options = {}) {
        if (!mode) {
            throw new Error("The 'mode' parameter is required.");
        }

        this.mode = mode;
        this.options = options;
        this.listeners = {};

        const defaultConfig = {
            assetsUrl: './dist/assets/'
        };
        const finalConfig = { ...defaultConfig, ...options };

        let initialFen = options.fen;

        if (this.mode === 'build') {
            this.chess = null; // No chess.js logic in build mode
            if (!initialFen) {
                initialFen = FEN.start;
            }
        } else { // 'match', 'analysis', 'train', etc.
            this.chess = new Chess(options.fen);
            initialFen = this.chess.fen();
        }

        this.board = new Chessboard(container, {
            position: initialFen,
            assetsUrl: finalConfig.assetsUrl,
            extensions: [
                { class: Arrows },
                { class: Markers, props: { autoMarkers: MARKER_TYPE.square } },
                { class: PromotionDialog },
                { class: RightClickAnnotator },
                { class: PieceSelectionDialog }
            ]
        });

        // Select the input handler based on the mode
        if (this.mode === 'build') {
            this.lastSquareClicked = null;
            this.lastClickTimestamp = 0;
            this.board.enableMoveInput(this.inputHandlerBuild.bind(this));
        } else {
            this.board.enableMoveInput(this.inputHandler.bind(this));
        }
    }

    // New input handler for "build" mode
    inputHandlerBuild(event) {
        if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
            const piece = this.board.getPiece(event.squareFrom);
            if (!piece) {
                // No piece on the square, show the selection dialog
                this.handlePieceSelection(event.squareFrom);
                return false; // Prevent move input
            }

            const now = new Date().getTime();
            // Double click detection
            if (this.lastSquareClicked === event.squareFrom && (now - this.lastClickTimestamp) < 300) {
                this.isDoubleClick = true; // Flag for cancellation handler
                return false; // Prevent drag
            }
            this.isDoubleClick = false;
            this.lastSquareClicked = event.squareFrom;
            this.lastClickTimestamp = now;

            // Piece exists, allow move input
            return true;
        } else if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
            // Allow moving pieces to any square
            return true;
        } else if (event.type === INPUT_EVENT_TYPE.moveInputFinished) {
            // This event now only handles successful moves
            setTimeout(() => this.emit('onChange', this.getFen()));
        } else if (event.type === INPUT_EVENT_TYPE.moveInputCanceled) {
            // Handle piece removal here (both double-click and drag-off-board)
            if (this.isDoubleClick) {
                this.board.setPiece(event.squareFrom, null);
                this.isDoubleClick = false; // Reset flag
            } else if (event.squareFrom) { // squareFrom is null if it's not a drag cancel
                // This indicates a piece was dragged off the board
                this.board.setPiece(event.squareFrom, null);
            }
            setTimeout(() => this.emit('onChange', this.getFen()));
        }
    }

    handlePieceSelection(square) {
        if (this.board.isPieceSelectionDialogShown()) {
            return;
        }
        this.board.showPieceSelectionDialog(square, (result) => {
            if (result.type === PIECE_SELECTION_DIALOG_RESULT_TYPE.pieceSelected) {
                this.board.setPiece(result.square, result.piece);
                setTimeout(() => this.emit('onChange', this.getFen()));
            }
        });
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
        if (this.mode === 'build') {
            const partialFen = this.board.getPosition();
            return this.completeFen(partialFen);
        }
        return this.chess.fen();
    }

    completeFen(partialFen) {
        // Appends the default turn, castling rights, etc., to a FEN string
        // that only contains piece placement.
        return `${partialFen} w KQkq - 0 1`;
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
        try {
            const result = this.chess.setTurn(color);
            this.board.setPosition(this.chess.fen(), true);
            return result;
        } catch (e) {
            throw e;
        }
    }

    // Arrow Methods
    addArrows(arrows) {
        this.board.removeArrows(); // Clear existing arrows before adding new ones
        arrows.forEach(arrow => {
            this.board.addArrow(arrow.from, arrow.to, arrow.type);
        });
    }

    getArrows() {
        return this.board.getArrows();
    }

    removeArrows() {
        this.board.removeArrows();
    }

    // Marker Methods
    addMarkers(markers) {
        this.board.removeMarkers(); // Clear existing markers before adding new ones
        markers.forEach(marker => {
            this.board.addMarker(marker.square, marker.type);
        });
    }

    getMarkers() {
        return this.board.getMarkers();
    }

    removeMarkers() {
        this.board.removeMarkers();
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
