/**
 * @file This file contains the PieceSelectionDialog extension for cm-chessboard.
 * @author Jules
 * @version 1.0.0
 * @license MIT
 */

import { Extension, EXTENSION_POINT } from '../../vendor/cm-chessboard/src/model/Extension.js';
import { PIECE } from '../../vendor/cm-chessboard/src/Chessboard.js';
import { Svg } from '../../vendor/cm-chessboard/src/lib/Svg.js';
import { Utils } from '../../vendor/cm-chessboard/src/lib/Utils.js';

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
     */
    constructor(chessboard) {
        super(chessboard);
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
    }

    /**
     * Closes the piece selection dialog.
     */
    closePieceSelectionDialog() {
        this.setDisplayState(DISPLAY_STATE.hidden);
    }

    /**
     * Shows the piece selection dialog.
     * @param {string} square - The square where the dialog should appear.
     * @param {function} callback - The callback function to execute when a piece is selected or the dialog is canceled.
     */
    showPieceSelectionDialog(square, callback) {
        this.state.dialogParams.square = square;
        this.state.callback = callback;
        this.setDisplayState(DISPLAY_STATE.shown);
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

            // Adjust position to stay within the board boundaries
            const dialogWidth = squareWidth * 2;
            let dialogX = squarePoint.x;
            if (dialogX + dialogWidth > this.chessboard.view.width) {
                dialogX = this.chessboard.view.width - dialogWidth;
            }

            const dialogHeight = squareHeight * 6;
            let dialogY = squarePoint.y;
            if (dialogY + dialogHeight > this.chessboard.view.height) {
                // Try to align the dialog's bottom with the square's bottom
                dialogY = squarePoint.y + squareHeight - dialogHeight;
                // If it overflows the top, align it to the top
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

            for (let i = 0; i < 6; i++) {
                // White pieces
                this.drawPieceButton(whitePieces[i], {
                    x: dialogX,
                    y: dialogY + i * squareHeight,
                });
                // Black pieces
                this.drawPieceButton(blackPieces[i], {
                    x: dialogX + squareWidth,
                    y: dialogY + i * squareHeight,
                });
            }
        }
    }

    /**
     * Handles the click event on a piece in the dialog.
     * @param {Event} event - The click event.
     * @private
     */
    pieceSelectionDialogOnClickPiece(event) {
        if (event.button !== 2) {
            if (event.target.dataset.piece) {
                if (this.state.callback) {
                    this.state.callback({
                        type: PIECE_SELECTION_DIALOG_RESULT_TYPE.pieceSelected,
                        square: this.state.dialogParams.square,
                        piece: event.target.dataset.piece,
                    });
                }
                this.setDisplayState(DISPLAY_STATE.hidden);
            } else {
                this.pieceSelectionDialogOnCancel(event);
            }
        }
    }

    /**
     * Handles the cancellation of the dialog.
     * @param {Event} event - The event that triggered the cancellation.
     * @private
     */
    pieceSelectionDialogOnCancel(event) {
        if (this.state.displayState === DISPLAY_STATE.shown) {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.setDisplayState(DISPLAY_STATE.hidden);
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
    contextMenu(event) {
        event.preventDefault();
        this.setDisplayState(DISPLAY_STATE.hidden);
        if (this.state.callback) {
            this.state.callback({ type: PIECE_SELECTION_DIALOG_RESULT_TYPE.canceled });
        }
    }

    /**
     * Sets the display state of the dialog and adds or removes event listeners accordingly.
     * @param {string} displayState - The new display state.
     * @private
     */
    setDisplayState(displayState) {
        this.state.displayState = displayState;
        if (displayState === DISPLAY_STATE.shown) {
            this.clickDelegate = Utils.delegate(
                this.chessboard.view.svg,
                'pointerdown',
                '*',
                this.pieceSelectionDialogOnClickPiece.bind(this)
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
