import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { io } from "socket.io-client"

// Components
import Navigation from './components/Navigation'
import Servers from './components/Servers'
import Channels from './components/Channels'
import Messages from './components/Messages'

// ABIs
import D3scord from './abis/D3scord.json' 
// Config
import config from './config.json';

// Socket
const socket = io('ws://localhost:3030');

function App() {
  const [provider, setProvider] = useState(null)
  const [account, setAccount] = useState(null)

  const [d3scord, setD3scord] = useState(null) // Updated to d3scord
  const [channels, setChannels] = useState([])

  const [currentChannel, setCurrentChannel] = useState(null)
  const [messages, setMessages] = useState([])

  const loadBlockchainData = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    setProvider(provider)

    const network = await provider.getNetwork()
    const d3scord = new ethers.Contract(config[network.chainId].D3scord.address, D3scord, provider) // Updated the contract reference to D3scord
    setD3scord(d3scord)

    const totalChannels = await d3scord.totalChannels() // Updated to d3scord
    const channels = []

    for (var i = 1; i <= totalChannels; i++) {
      const channel = await d3scord.getChannel(i) // Updated to d3scord
      channels.push(channel)
    }

    setChannels(channels)

    window.ethereum.on('accountsChanged', async () => {
      window.location.reload()
    })
  }

  useEffect(() => {
    loadBlockchainData()

    // --> https://socket.io/how-to/use-with-react-hooks

    socket.on("connect", () => {
      socket.emit('get messages')
    })

    socket.on('new message', (messages) => {
      setMessages(messages)
    })

    socket.on('get messages', (messages) => {
      setMessages(messages)
    })

    return () => {
      socket.off('connect')
      socket.off('new message')
      socket.off('get messages')
    }
  }, [])

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />

      <main>
        <Servers />

        <Channels
          provider={provider}
          account={account}
          d3scord={d3scord} // Updated prop to d3scord
          channels={channels}
          currentChannel={currentChannel}
          setCurrentChannel={setCurrentChannel}
        />

        <Messages account={account} messages={messages} currentChannel={currentChannel} />
      </main>
    </div>
  );
}

export default App;
