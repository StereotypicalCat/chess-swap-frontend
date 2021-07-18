import React, { Component } from "react";
import PropTypes from "prop-types";
import Chess, {Piece} from "chess.js"; // import Chess from  "chess.js"(default) if recieving an error about new Chess() not being a constructor
import Chessboard from "chessboardjsx";
import Color from "./Color";
import ConnectionCommands from "./ConnectionCommands";

interface IChessSwapProps {
    orientation: Color,
    updateTurnsToSwapOnGui: (number) => void,
    turnsToSwap: number,
    ws: WebSocket,
    isSpectating: boolean
}
interface IChessSwapState {
    fen: string,
    dropSquareStyle: object,
    squareStyles: object,
    pieceSquare: string,
    square: string,
    history: [],
    currentOrientation: Color,
    turnsToNextSwap: number,
    currentPlayerColor: Color,
    currentlyMyTurn: boolean,
    windowHeight: number,
    windowWidth: number
}

interface IOnDrop {
    sourceSquare: string,
    targetSquare: string,
    piece: Piece
}

export default class ChessSwap extends Component<IChessSwapProps, IChessSwapState> {

    // @ts-ignore
    // It obviously does, rtfm typescript!
    game = new Chess();

    constructor(props: IChessSwapProps | Readonly<IChessSwapProps>) {
        super(props);

        // Starting state
        this.state = {
            fen: "start",
            // square styles for active drop square
            dropSquareStyle: {},
            // custom square styles
            squareStyles: {},
            // square with the currently clicked piece
            pieceSquare: "",
            // currently clicked square
            square: "",
            // array of past game moves
            history: [],
            // Which color the player is
            currentOrientation: this.props.orientation,
            // When to swap
            turnsToNextSwap: this.props.turnsToSwap,
            // Color
            currentPlayerColor: this.props.orientation,
            // Whos turn it is
            currentlyMyTurn: this.props.orientation === Color.white,
            // The size of the chessboard is determined based on the lowest of these
            windowHeight: window.innerHeight,
            windowWidth: window.innerWidth
        };

        // Network Code
        this.props.ws.onmessage = (evt) => {
            const message = evt.data;
            console.log(message);
            const cmd: string[] = message.split(ConnectionCommands.seperator)

            switch (cmd[0]) {
                case ConnectionCommands.newMove:
                    console.log("Doing new move from server")
                    let move = this.game.move({
                        from: cmd[1],
                        to: cmd[2],
                        promotion: "q" // always promote to a queen for example simplicity
                    });

                    // illegal move
                    if (move === null) return;

                    this.setState(({ history, pieceSquare }) => ({
                        fen: this.game.fen(),
                        history: this.game.history({ verbose: true }),
                        squareStyles: squareStyling({ pieceSquare, history }),
                        currentlyMyTurn: true,
                        turnsToNextSwap: this.state.turnsToNextSwap - 1
                    }));
                    this.swapIfNeeded();
                    this.props.updateTurnsToSwapOnGui(this.state.turnsToNextSwap)
                    break;
                case ConnectionCommands.isThereOpponent:
                    // Spectator joined
                    this.props.ws.send(ConnectionCommands.youAreSpectator)
            }

        }

        // UI Code
        window.addEventListener('resize', () => {this.setState({windowHeight: window.innerHeight, windowWidth: window.innerWidth})})
    }

    static propTypes = { children: PropTypes.func };

    // keep clicked square style and remove hint squares
    removeHighlightSquare = () => {
        this.setState(({ pieceSquare, history }) => ({
            squareStyles: squareStyling({ pieceSquare, history })
        }));
    };

    // show possible moves
    highlightSquare = (sourceSquare: string, squaresToHighlight: string[]) => {
        const highlightStyles = [sourceSquare, ...squaresToHighlight].reduce(
            (a, c) => {
                return {
                    ...a,
                    ...{
                        [c]: {
                            background:
                                "radial-gradient(circle, #fffc00 36%, transparent 40%)",
                            borderRadius: "50%"
                        }
                    },
                    ...squareStyling({
                        history: this.state.history,
                        pieceSquare: this.state.pieceSquare
                    })
                };
            },
            {}
        );

        this.setState(({ squareStyles }) => ({
            squareStyles: { ...squareStyles, ...highlightStyles }
        }));
    };

    onDrop = (info: IOnDrop ) => {
        // Test that it is the players turn
        if (!this.state.currentlyMyTurn){
            return;
        }
        // Test if the player is a spectator
        if (this.props.isSpectating){
            return;
        }

        let sourceSquare = info.sourceSquare;
        let targetSquare = info.targetSquare;
        // see if the move is legal
        let move = this.game.move({
            from: sourceSquare,
            to: targetSquare,
            promotion: "q" // always promote to a queen for example simplicity
        });

        // illegal move
        if (move === null) return;

        this.setState(({ history, pieceSquare }) => ({
            fen: this.game.fen(),
            history: this.game.history({ verbose: true }),
            squareStyles: squareStyling({ pieceSquare, history })
        }));

        this.props.ws.send(ConnectionCommands.newMove + ConnectionCommands.seperator + info.sourceSquare + ConnectionCommands.seperator + info.targetSquare)
        this.setState({
            turnsToNextSwap: this.state.turnsToNextSwap - 1,
            currentlyMyTurn: false})
        this.swapIfNeeded();
        this.props.updateTurnsToSwapOnGui(this.state.turnsToNextSwap)
    };

    swapIfNeeded = () => {
        if (this.state.turnsToNextSwap === 0){
            let newColor = this.state.currentPlayerColor === Color.white ? Color.black : Color.white;
            this.setState({
                turnsToNextSwap: this.props.turnsToSwap,
                currentPlayerColor: newColor,
                currentOrientation: newColor,
                currentlyMyTurn: newColor === Color.black
            })
        }
    }

    onMouseOverSquare = (square: string) => {
        // Don't show moves when not your turn
        if (!this.state.currentlyMyTurn){
            return;
        }

        // get list of possible moves for this square
        let moves = this.game.moves({
            square: square,
            verbose: true
        });

        // exit if there are no moves available for this square
        if (moves.length === 0) return;

        let squaresToHighlight: string[] = [];
        for (var i = 0; i < moves.length; i++) {
            squaresToHighlight.push(moves[i].to);
        }

        this.highlightSquare(square, squaresToHighlight);
    };

    onMouseOutSquare = () => this.removeHighlightSquare();

    // central squares get diff dropSquareStyles
    onDragOverSquare = (square: string) => {
        this.setState({
            dropSquareStyle:
                square === "e4" || square === "d4" || square === "e5" || square === "d5"
                    ? { backgroundColor: "cornFlowerBlue" }
                    : { boxShadow: "inset 0 0 1px 4px rgb(255, 255, 0)" }
        });
    };

    onSquareClick = (square: string) => {
        this.setState(({ history }) => ({
            squareStyles: squareStyling({ pieceSquare: square, history }),
            pieceSquare: square
        }));

        let move = this.game.move({
            from: this.state.pieceSquare,
            to: square,
            promotion: "q" // always promote to a queen for example simplicity
        });

        // illegal move
        if (move === null) return;

        this.setState({
            fen: this.game.fen(),
            history: this.game.history({ verbose: true }),
            pieceSquare: ""
        });
    };

    onSquareRightClick = (square: string) =>
        this.setState({
            squareStyles: { [square]: { backgroundColor: "deepPink" } }
        });

    render() {

        const { fen, dropSquareStyle, squareStyles } = this.state;

        return <Chessboard
            id="chess-board"
            width={0.8 * Math.min(this.state.windowHeight, this.state.windowWidth)}
            position={fen}
            /* @ts-ignore */
            onDrop={this.onDrop}
            orientation={this.state.currentOrientation}
            onMouseOverSquare={this.onMouseOverSquare}
            onMouseOutSquare={this.onMouseOutSquare}
            boardStyle={{
                borderRadius: "5px",
                boxShadow: `0 5px 15px rgba(0, 0, 0, 0.5)`
            }}
            squareStyles={squareStyles}
            dropSquareStyle={dropSquareStyle}
            onDragOverSquare={this.onDragOverSquare}
            onSquareClick={this.onSquareClick}
            onSquareRightClick={this.onSquareRightClick}
        />
    }
}
// @ts-ignore
const squareStyling = ({ pieceSquare, history }) => {
    const sourceSquare = history.length && history[history.length - 1].from;
    const targetSquare = history.length && history[history.length - 1].to;

    return {
        [pieceSquare]: { backgroundColor: "rgba(255, 255, 0, 0.4)" },
        ...(history.length && {
            [sourceSquare]: {
                backgroundColor: "rgba(255, 255, 0, 0.4)"
            }
        }),
        ...(history.length && {
            [targetSquare]: {
                backgroundColor: "rgba(255, 255, 0, 0.4)"
            }
        })
    };
};
