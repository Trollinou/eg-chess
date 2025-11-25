import { Chess } from "../vendor/chess.js/chess.js";
import { Chessboard, FEN, INPUT_EVENT_TYPE, COLOR, BORDER_TYPE } from "../vendor/cm-chessboard/src/Chessboard.js";
import { MARKER_TYPE, Markers } from "../vendor/cm-chessboard/src/extensions/markers/Markers.js";
import { ARROW_TYPE, Arrows } from "../vendor/cm-chessboard/src/extensions/arrows/Arrows.js";
import { RightClickAnnotator } from "../vendor/cm-chessboard/src/extensions/right-click-annotator/RightClickAnnotator.js";
import { PromotionDialog } from "../vendor/cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js";
import { PieceSelectionDialog, PIECE_SELECTION_DIALOG_RESULT_TYPE } from "./extensions/PieceSelectionDialog.js";

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
            // Initialize fenState for build mode
            const fenParts = initialFen.split(' ');
            this.fenState = {
                enPassant: fenParts[3] || '-',
                halfMove: parseInt(fenParts[4], 10) || 0,
                fullMove: parseInt(fenParts[5], 10) || 1
            };
        } else { // 'match', 'analysis', 'train', etc.
            this.chess = new Chess(options.fen);
            initialFen = this.chess.fen();
        }

        if (this.mode === 'build') {
            this.board = new Chessboard(container, {
                position: initialFen,
                responsive: true,
                assetsUrl: finalConfig.assetsUrl,
                assetsCache: false,
                style: {
                    cssClass: "default",
                    showCoordinates: true,
                    borderType: BORDER_TYPE.frame,
                    aspectRatio: 0.98,
                    animationDuration: 0 // Disable all animations in build mode
                },
                extensions: [
                    { class: Arrows },
                    { class: Markers, props: { autoMarkers: MARKER_TYPE.frame } },
                    { class: RightClickAnnotator },
                    {
                        class: PieceSelectionDialog,
                        props: {
                            egChess: this // Pass the EGChess instance to the extension
                        }
                    }
                ]
            });
        } else {
            this.board = new Chessboard(container, {
                position: initialFen,
                responsive: true,
                assetsUrl: finalConfig.assetsUrl,
                extensions: [
                    { class: Arrows },
                    { class: Markers, props: { autoMarkers: MARKER_TYPE.frame } },
                    { class: RightClickAnnotator },
                    { class: PromotionDialog }
                ]
            });
        }

        // Select the input handler based on the mode
        if (this.mode === 'build') {
            this.lastSquareClicked = null;
            this.lastClickTimestamp = 0;
            this.board.enableMoveInput(this.inputHandlerBuild.bind(this));
            // Add listeners for build mode interactions
            this.board.context.addEventListener("pointerdown", this.buildModePointerDownHandler.bind(this));
            this.board.context.addEventListener("mouseup", this.buildModeMouseUpHandler.bind(this));
        } else {
            this.board.enableMoveInput(this.inputHandler.bind(this));
        }
    }

    // Custom pointer down handler for build mode to detect clicks on empty squares
    buildModePointerDownHandler(event) {
        if (event.button !== 0) { // Left-click only
            return;
        }
        const square = this.findSquareFromEvent(event);
        if (square) {
            const piece = this.board.getPiece(square);
            if (!piece) {
                // This is a left click on an empty square, show the dialog
                event.preventDefault(); // Prevent cm-chessboard's move input from starting
                this.handlePieceSelection(square);
            }
        }
    }

    // Custom mouse up handler for build mode to detect right-click annotations
    buildModeMouseUpHandler(event) {
        if (event.button === 2) { // Right-click
            // Use a short timeout to ensure the annotator has finished its work before we get the FEN
            setTimeout(() => this.emit('onChange', this.getFen()));
        }
    }

    // Helper method to find the square from a pointer event
    findSquareFromEvent(event) {
        const target = event.target;
        if (target.getAttribute && target.getAttribute("data-square")) {
            return target.getAttribute("data-square");
        }
        const el = target.closest && target.closest("[data-square]");
        return el ? el.getAttribute("data-square") : undefined;
    }

    // New input handler for "build" mode
    async inputHandlerBuild(event) {
        if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
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
                await this.board.setPiece(event.squareFrom, null, false);
                this.isDoubleClick = false; // Reset flag
            } else if (event.squareFrom) { // squareFrom is null if it's not a drag cancel
                // This indicates a piece was dragged off the board
                await this.board.setPiece(event.squareFrom, null, false);
            }
            setTimeout(() => this.emit('onChange', this.getFen()));
        }
    }

    handlePieceSelection(square) {
        if (this.board.isPieceSelectionDialogShown()) {
            return;
        }
        this.board.showPieceSelectionDialog(square, async (result) => {
            if (result.type === PIECE_SELECTION_DIALOG_RESULT_TYPE.pieceSelected) {
                await this.board.setPiece(result.square, result.piece, false);
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
            const position = this.board.getPosition();
            const turn = this.board.getOrientation() === COLOR.white ? 'w' : 'b';

            let castlingRights = "";
            if (this.board.getPiece('e1') === 'wk' && this.board.getPiece('h1') === 'wr') castlingRights += 'K';
            if (this.board.getPiece('e1') === 'wk' && this.board.getPiece('a1') === 'wr') castlingRights += 'Q';
            if (this.board.getPiece('e8') === 'bk' && this.board.getPiece('h8') === 'br') castlingRights += 'k';
            if (this.board.getPiece('e8') === 'bk' && this.board.getPiece('a8') === 'br') castlingRights += 'q';
            if (castlingRights === "") {
                castlingRights = "-";
            }

            return `${position} ${turn} ${castlingRights} ${this.fenState.enPassant} ${this.fenState.halfMove} ${this.fenState.fullMove}`;
        }
        return this.chess.fen();
    }

    reset() {
        if (this.mode === 'build') {
            this.load(FEN.start);
            return;
        }
        this.chess.reset();
        this.board.setPosition(this.chess.fen());
    }

    async load(fen) {
        if (this.mode === 'build') {
            const fenParts = fen.split(' ');
            const position = fenParts[0];
            const turn = fenParts[1];

            // Update internal state
            this.fenState.enPassant = fenParts[3] || '-';
            this.fenState.halfMove = parseInt(fenParts[4], 10) || 0;
            this.fenState.fullMove = parseInt(fenParts[5], 10) || 1;

            // Update the board
            await this.board.setPosition(position, false);
            const newOrientation = turn === 'w' ? COLOR.white : COLOR.black;
            if (this.board.getOrientation() !== newOrientation) {
                await this.board.setOrientation(newOrientation, false);
            }

            this.emit('onChange', this.getFen());
            return;
        }

        if (this.chess.load(fen)) {
            await this.board.setPosition(this.chess.fen(), true);
        }
    }

    async setOrientation(color) {
        // Guard against re-running if already in the correct orientation
        if (this.board.getOrientation() === color) {
            return;
        }

        if (this.mode === 'build') {
            await this.board.setOrientation(color, false);
            this.emit('onChange', this.getFen());
        } else {
            // For other modes, just flip the board visually without changing the FEN logic
            await this.board.setOrientation(color);
        }
    }

    async undo() {
        if (this.mode === 'build') {
            // Undo is not applicable in build mode
            return;
        }
        this.chess.undo();
        await this.board.setPosition(this.chess.fen());
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
