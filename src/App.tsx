import React from 'react';
import './App.css';
import {v4 as uuidv4} from 'uuid';
import ChessSwap from "./ChessSwap";
import Color from "./Color";
import ConnectionCommands from "./ConnectionCommands";

interface IAppProps {

}
interface IAppState {
    lobby: string,
    joinLobbyText: string,
    playerColor: Color | undefined,
    turnsToSwap: number,
    isSpectator: boolean
}

class App extends React.Component<IAppProps, IAppState> {

    ws: WebSocket|null = null;

    constructor(props: {}) {
        super(props);

        this.state = {
            lobby: "",
            joinLobbyText: "",
            playerColor: undefined,
            turnsToSwap: 6,
            isSpectator: false
        }
    }

    createLobby(){
        let newLobby: string = uuidv4();
        this.setState({lobby: newLobby})
        this.connectToLobby(newLobby);
    }

    updateTurnsToSwap(turnsToSwap: number){
        this.setState({
            turnsToSwap: turnsToSwap
        })
    }

    joinLobby(lobbyName: string){
        this.setState({lobby: lobbyName})
        this.connectToLobby(lobbyName);
    }

    connectToLobby(lobbyName){

        if (this.ws?.OPEN){
            this.ws.close();
        }

        console.log("Connecting to lobby " + lobbyName + "...")

        this.ws = new WebSocket(`ws://localhost:5000/${lobbyName}/ws`)

        this.ws.onopen = () => {
            console.log('connected to lobby: ' + lobbyName);
            this.ws?.send(ConnectionCommands.isThereOpponent)
        }

        this.ws.onmessage = evt => {
            //const message = JSON.parse(evt.data);
            const message = evt.data;
            console.log(message);

            switch (message) {
                case ConnectionCommands.isThereOpponent:
                    this.ws?.send(ConnectionCommands.opponentReady);
                    console.log("I am white");
                    this.setState({playerColor: Color.white})
                    break;
                case ConnectionCommands.opponentReady:
                    console.log("I am black");
                    this.setState({playerColor: Color.black})
                    break
                case ConnectionCommands.youAreSpectator:
                    console.log("Game is already in progress. Spectating game")
                    this.setState({isSpectator: true})
                    this.setState({playerColor: Color.white})
                    break
            }

        }
    }

     getWebsocket(): WebSocket {
        if (this.ws == null){
            throw Error("Websocket wasn't ready")
        }
        else{
            return this.ws;
        }
     }

    render(){
        if (this.state.lobby === ""){
            return  <div>
                <h3>Welcome to Chess Swap!</h3>
                <p>A game by <a href="https://lucaswinther.info">Lucas Winther</a></p>
                <p>This was made using open source tools. See the <a href={"https://github.com/StereotypicalCat/chess-swap-backend"}>backend</a> or <a href={"https://github.com/StereotypicalCat/chess-swap-frontend"}>frontend</a> respotistory for more information</p>
                <button onClick={this.createLobby.bind(this)}>Create a lobby</button>
                <button onClick={() => {this.joinLobby.bind(this); this.joinLobby(this.state.joinLobbyText)}}>Join this lobby: </button> <input type={"text"} value={this.state.joinLobbyText} onChange={(e) => this.setState({joinLobbyText: e.target.value})} placeholder={"lobby name"}/>
            </div>
        }
        else if (this.state.playerColor !== undefined){
            return <div>
                <p>Swap in {this.state.turnsToSwap} turns</p>
                <ChessSwap orientation={this.state.playerColor} updateTurnsToSwapOnGui={this.updateTurnsToSwap.bind(this)} turnsToSwap={6} ws={this.getWebsocket()} isSpectating={this.state.isSpectator}/>
            </div>
        }
        else{
            return <div>
                <h3>You are in lobby</h3> <h3>{this.state.lobby}</h3>
                <p>Waiting for opponent</p>
            </div>
        }

    }
}

export default App;
