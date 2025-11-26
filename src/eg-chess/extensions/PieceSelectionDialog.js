/**
 * @file This file contains the PieceSelectionDialog extension for cm-chessboard.
 * @author Jules
 * @version 1.0.0
 * @license MIT
 */

import { Extension, EXTENSION_POINT, PIECE, COLOR, FEN, Svg, Utils } from 'cm-chessboard';

const DISPLAY_STATE = {
    hidden: 'hidden',
    displayRequested: 'displayRequested',
    shown: 'shown',
};

export const PIECE_SELECTION_DIALOG_RESULT_TYPE = {
    pieceSelected: 'pieceSelected',
    canceled: 'canceled',
};

/**
 * @class PieceSelectionDialog
 * @extends Extension
 * @classdesc An extension for cm-chessboard to display a dialog for selecting a piece to place on a square.
 */
export class PieceSelectionDialog extends Extension {
    /**
     * @constructor
     * @param {object} chessboard - The chessboard instance.
     * @param {object} props - The properties passed to the extension.
     */
    constructor(chessboard, props) {
        super(chessboard);
        this.props = props;
        this.egChess = this.props.egChess; // Reference to the main EGChess instance

        this.registerExtensionPoint(EXTENSION_POINT.afterRedrawBoard, this.extensionPointRedrawBoard.bind(this));
        chessboard.showPieceSelectionDialog = this.showPieceSelectionDialog.bind(this);
        chessboard.isPieceSelectionDialogShown = this.isPieceSelectionDialogShown.bind(this);
        chessboard.closePieceSelectionDialog = this.closePieceSelectionDialog.bind(this);
        this.pieceSelectionDialogGroup = Svg.addElement(chessboard.view.interactiveTopLayer, 'g', { class: 'piece-selection-dialog-group' });
        this.state = {
            displayState: DISPLAY_STATE.hidden,
            callback: null,
            dialogParams: {
                square: null,
            },
        };
        this.isProcessingClick = false;
    }

    /**
     * Closes the piece selection dialog.
     */
    async closePieceSelectionDialog() {
        await this.setDisplayState(DISPLAY_STATE.hidden);
    }

    /**
     * Shows the piece selection dialog.
     * @param {string} square - The square where the dialog should appear.
     * @param {function} callback - The callback function to execute when a piece is selected or the dialog is canceled.
     */
    async showPieceSelectionDialog(square, callback) {
        this.state.dialogParams.square = square;
        this.state.callback = callback;
        await this.setDisplayState(DISPLAY_STATE.shown);
    }

    /**
     * Checks if the piece selection dialog is shown.
     * @returns {boolean} True if the dialog is shown or requested, false otherwise.
     */
    isPieceSelectionDialogShown() {
        return this.state.displayState === DISPLAY_STATE.shown || this.state.displayState === DISPLAY_STATE.displayRequested;
    }

    /**
     * Redraws the dialog when the board is redrawn.
     * @private
     */
    extensionPointRedrawBoard() {
        this.redrawDialog();
    }

    /**
     * Draws a piece button in the dialog.
     * @param {string} piece - The piece code (e.g., 'wp', 'bk').
     * @param {object} point - The coordinates where the piece should be drawn.
     * @private
     */
    drawPieceButton(piece, point) {
        const squareWidth = this.chessboard.view.squareWidth;
        const squareHeight = this.chessboard.view.squareHeight;
        Svg.addElement(this.pieceSelectionDialogGroup, 'rect', {
            x: point.x,
            y: point.y,
            width: squareWidth,
            height: squareHeight,
            class: 'piece-selection-dialog-button',
            'data-piece': piece,
        });
        this.chessboard.view.drawPiece(this.pieceSelectionDialogGroup, piece, point);
    }

    /**
     * Draws an action button in the dialog.
     * @param {string} action - The action identifier.
     * @param {string} iconUrl - The URL of the SVG icon.
     * @param {object} point - The coordinates where the button should be drawn.
     * @private
     */
    drawActionButton(action, iconUrl, point) {
        const squareWidth = this.chessboard.view.squareWidth;
        const squareHeight = this.chessboard.view.squareHeight;

        // Create a group for the button
        const buttonGroup = Svg.addElement(this.pieceSelectionDialogGroup, 'g', {
            'data-action': action,
            class: 'piece-selection-dialog-button'
        });

        Svg.addElement(buttonGroup, 'rect', {
            x: point.x,
            y: point.y,
            width: squareWidth,
            height: squareHeight,
            // The class is on the group, so no need to repeat it here for event handling
        });

        const padding = squareWidth * 0.15; // 15% padding
        Svg.addElement(buttonGroup, 'image', {
            href: iconUrl,
            x: point.x + padding,
            y: point.y + padding,
            width: squareWidth - 2 * padding,
            height: squareHeight - 2 * padding,
        });
    }


    /**
     * Redraws the dialog.
     * @private
     */
    redrawDialog() {
        while (this.pieceSelectionDialogGroup.firstChild) {
            this.pieceSelectionDialogGroup.removeChild(this.pieceSelectionDialogGroup.firstChild);
        }
        if (this.state.displayState === DISPLAY_STATE.shown) {
            const squareWidth = this.chessboard.view.squareWidth;
            const squareHeight = this.chessboard.view.squareHeight;
            const squarePoint = this.chessboard.view.squareToPoint(this.state.dialogParams.square);

            const whitePieces = [PIECE.wp, PIECE.wb, PIECE.wn, PIECE.wr, PIECE.wq, PIECE.wk];
            const blackPieces = [PIECE.bp, PIECE.bb, PIECE.bn, PIECE.br, PIECE.bq, PIECE.bk];

            // Dialog dimensions now include 2 extra rows for action buttons
            const dialogWidth = squareWidth * 2;
            const dialogHeight = squareHeight * (6 + 2); // 6 rows for pieces, 2 for actions

            // Adjust position to stay within the board boundaries
            let dialogX = squarePoint.x;
            if (dialogX + dialogWidth > this.chessboard.view.width) {
                dialogX = this.chessboard.view.width - dialogWidth;
            }

            let dialogY = squarePoint.y;
            if (dialogY + dialogHeight > this.chessboard.view.height) {
                dialogY = squarePoint.y + squareHeight - dialogHeight;
                if (dialogY < 0) {
                    dialogY = 0;
                }
            }

            Svg.addElement(this.pieceSelectionDialogGroup, 'rect', {
                x: dialogX,
                y: dialogY,
                width: dialogWidth,
                height: dialogHeight,
                class: 'piece-selection-dialog',
            });

            // Draw piece selection buttons
            for (let i = 0; i < 6; i++) {
                this.drawPieceButton(whitePieces[i], {
                    x: dialogX,
                    y: dialogY + i * squareHeight,
                });
                this.drawPieceButton(blackPieces[i], {
                    x: dialogX + squareWidth,
                    y: dialogY + i * squareHeight,
                });
            }

            // Draw action buttons below the pieces
            const actionsY = dialogY + 6 * squareHeight;
            this.drawActionButton('rotate', '/assets/svg/rotate_board.svg', { x: dialogX, y: actionsY });
            this.drawActionButton('fen', '/assets/svg/fen_button.svg', { x: dialogX + squareWidth, y: actionsY });
            this.drawActionButton('clear', '/assets/svg/empty_board.svg', { x: dialogX, y: actionsY + squareHeight });
            this.drawActionButton('start', '/assets/svg/board_start.svg', { x: dialogX + squareWidth, y: actionsY + squareHeight });
        }
    }

    /**
     * Handles the click event on a piece in the dialog.
     * @param {Event} event - The click event.
     * @private
     */
    async pieceSelectionDialogOnClick(event) {
        if (event.button === 2 || this.isProcessingClick) {
            return;
        }
        this.isProcessingClick = true;
        event.preventDefault();

        const target = event.target;
        const pieceElement = target.closest('[data-piece]');
        const actionElement = target.closest('[data-action]');

        try {
            if (pieceElement) {
                if (this.state.callback) {
                    this.state.callback({
                        type: PIECE_SELECTION_DIALOG_RESULT_TYPE.pieceSelected,
                        square: this.state.dialogParams.square,
                        piece: pieceElement.dataset.piece,
                    });
                }
                await this.setDisplayState(DISPLAY_STATE.hidden);
            } else if (actionElement) {
                const action = actionElement.dataset.action;
                switch (action) {
                    case 'rotate':
                        const newOrientation = this.chessboard.getOrientation() === COLOR.white ? COLOR.black : COLOR.white;
                        await this.egChess.setOrientation(newOrientation);
                        break;
                    case 'fen':
                        const fen = prompt("Enter FEN string:", this.egChess.getFen());
                        if (fen) {
                            await this.egChess.load(fen);
                        }
                        break;
                    case 'clear':
                        await this.egChess.load("8/8/8/8/8/8/8/8 w - - 0 1");
                        break;
                    case 'start':
                        await this.egChess.load(FEN.start);
                        break;
                }
                await this.setDisplayState(DISPLAY_STATE.hidden);
            } else {
                await this.pieceSelectionDialogOnCancel(event);
            }
        } finally {
            this.isProcessingClick = false;
        }
    }

    /**
     * Handles the cancellation of the dialog.
     * @param {Event} event - The event that triggered the cancellation.
     * @private
     */
    async pieceSelectionDialogOnCancel(event) {
        if (this.state.displayState === DISPLAY_STATE.shown) {
            event.preventDefault();
            event.stopImmediatePropagation();
            await this.setDisplayState(DISPLAY_STATE.hidden);
            if (this.state.callback) {
                this.state.callback({ type: PIECE_SELECTION_DIALOG_RESULT_TYPE.canceled });
            }
        }
    }

    /**
     * Handles the context menu event to cancel the dialog.
     * @param {Event} event - The context menu event.
     * @private
     */
    async contextMenu(event) {
        event.preventDefault();
        await this.setDisplayState(DISPLAY_STATE.hidden);
        if (this.state.callback) {
            this.state.callback({ type: PIECE_SELECTION_DIALOG_RESULT_TYPE.canceled });
        }
    }

    /**
     * Sets the display state of the dialog.
     * Note: This function is async to introduce a microtask delay. This resolves a
     * race condition with the synchronous `window.prompt()` which can cause click
     * events to re-fire upon closing the prompt.
     * @param {string} displayState - The new display state.
     * @private
     */
    async setDisplayState(displayState) {
        this.state.displayState = displayState;
        if (displayState === DISPLAY_STATE.shown) {
            // Use 'click' instead of 'pointerdown' to avoid double firing
            this.clickDelegate = Utils.delegate(
                this.chessboard.view.svg,
                'click',
                '*',
                this.pieceSelectionDialogOnClick.bind(this)
            );
            this.contextMenuListener = this.contextMenu.bind(this);
            this.chessboard.view.svg.addEventListener('contextmenu', this.contextMenuListener);
        } else if (displayState === DISPLAY_STATE.hidden) {
            if (this.clickDelegate) {
                this.clickDelegate.remove();
            }
            if (this.contextMenuListener) {
                this.chessboard.view.svg.removeEventListener('contextmenu', this.contextMenuListener);
            }
        }
        this.redrawDialog();
    }
}
