import React from 'react';
import './App.css';
import {v4 as uuidv4} from 'uuid';
import ChessSwap from "./ChessSwap";
import Color from "./Color";

interface IAppProps {

}
interface IAppState {
    lobby: string,
    joinLobbyText: string,
    playerColor: Color | undefined,
    turnsToSwap: number
}

class App extends React.Component<IAppProps, IAppState> {

    ws: WebSocket|null = null;

    constructor(props: {}) {
        super(props);

        this.state = {
            lobby: "",
            joinLobbyText: "",
            playerColor: undefined,
            turnsToSwap: 6
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
        // TODO: Do announcement here
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
            this.ws?.send("isThereOpponent")
        }

        this.ws.onmessage = evt => {
            //const message = JSON.parse(evt.data);
            const message = evt.data;
            console.log(message);

            switch (message) {
                case "isThereOpponent":
                    this.ws?.send("OpponentReady");
                    console.log("I am white");
                    this.setState({playerColor: Color.white})
                    break;
                case "OpponentReady":
                    console.log("I am black");
                    this.setState({playerColor: Color.black})
            }

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
                <ChessSwap orientation={this.state.playerColor} updateTurnsToSwapOnGui={this.updateTurnsToSwap.bind(this)} turnsToSwap={6} />
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
