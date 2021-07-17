import React from 'react';
import './App.css';

interface IAppProps {

}
interface IAppState {
    text: string,
    chat: string
}

class App extends React.Component<IAppProps, IAppState> {

    constructor(props: {}) {
        super(props);

        this.state = {
            text: "",
            chat: ""
        }
    }

    ws = new WebSocket("ws://localhost:5000/ws");



    componentDidMount(){
        this.ws.onopen = () => {
            console.log('connected')
        }

        this.ws.onmessage = evt => {
            //const message = JSON.parse(evt.data);
            const message = evt.data;
            this.setState({chat: this.state.chat + "\n" + message})
            console.log(message);
        }

        return () => this.ws.close();
    }

    render(){
        return  <div>
            <h3>Chat</h3>
            <pre id="chat">{this.state.chat}</pre>
            <input placeholder="say something" id="text" type="text" value={this.state.text} onChange={(e) => this.setState({
                text: e.target.value
            })}/>
            <button onClick={(e => {this.ws.send(this.state.text)})}/>
        </div>
    }
}

export default App;
