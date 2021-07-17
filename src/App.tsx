import React from 'react';
import './App.css';
import {Simulate} from "react-dom/test-utils";

interface IAppProps {

}
interface IAppState {
    text: string,
    chat: string,
    lobby: string
}

class App extends React.Component<IAppProps, IAppState> {

    ws: WebSocket|null = null;

    constructor(props: {}) {
        super(props);

        this.state = {
            text: "",
            chat: "",
            lobby: ""
        }

        this.joinLobby("default");
    }


    joinLobby(lobbyName: string){

        if (this.ws?.OPEN){
            this.ws.close();
        }

        console.log("Connecting to lobby " + lobbyName + "...")

        this.ws = new WebSocket(`ws://localhost:5000/${lobbyName}/ws`)

        this.ws.onopen = () => {
            console.log('connected to lobby: ' + lobbyName);
        }

        this.ws.onmessage = evt => {
            //const message = JSON.parse(evt.data);
            const message = evt.data;
            this.setState({chat: this.state.chat + "\n" + message})
            console.log(message);
        }
    }

    render(){
        return  <div>
            <h3>Chat</h3>
            <pre id="chat">{this.state.chat}</pre>
            <input placeholder="say something" id="text" type="text" value={this.state.text} onChange={(e) => this.setState({
                text: e.target.value
            })}/>
            <p>Current Lobby:</p>
            <input placeholder="say something" id="text" type="text" value={this.state.lobby} onChange={(e) => this.setState({
                lobby: e.target.value
            })}/>
            <button onClick={(e => {
                // ws is not null after constructor.
                // @ts-ignore
                this.ws.send(this.state.text)})}>Send message</button>
            <button onClick={(e => {this.joinLobby(this.state.lobby)})}>Join Lobby</button>
        </div>
    }
}

export default App;
