import { useEffect, useState, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { io }     from "socket.io-client";

import D3scordABI from "./abis/D3scord.json";
import config     from "./config.json";

import Nav          from "./components/Nav";
import Sidebar      from "./components/Sidebar";
import ChannelPanel from "./components/ChannelPanel";
import ChatArea     from "./components/ChatArea";
import MembersPanel from "./components/MembersPanel";

// ── ONE global socket, reconnects automatically ───────────────────────────────
const SERVER = process.env.REACT_APP_SERVER_URL || "http://localhost:3030";
const socket = io(SERVER, { autoConnect: false, reconnection: true });

export default function App() {
  /* ── blockchain ── */
  const [provider,  setProvider]  = useState(null);
  const [account,   setAccount]   = useState(null);
  const [contract,  setContract]  = useState(null);
  const [chainId,   setChainId]   = useState(null);
  const [channels,  setChannels]  = useState([]);
  const [joined,    setJoined]    = useState(new Set()); // channel IDs user owns

  /* ── chat ── */
  const [currentCh, setCurrentCh] = useState(null);
  const [messages,  setMessages]  = useState([]);
  const [online,    setOnline]    = useState([]);
  const [typing,    setTyping]    = useState([]);
  const [live,      setLive]      = useState(false);

  /* ── UI ── */
  const [busy,  setBusy]  = useState("");
  const [toast, setToast] = useState(null);

  const currentChRef = useRef(null);
  currentChRef.current = currentCh;

  /* ── helpers ── */
  const showToast = useCallback((type, title, msg) => {
    setToast({ type, title, msg });
    setTimeout(() => setToast(null), 4500);
  }, []);

  /* ── load blockchain data ── */
  const loadChain = useCallback(async (acct) => {
    const prov    = new ethers.providers.Web3Provider(window.ethereum);
    const network = await prov.getNetwork();
    const cid     = network.chainId;

    setProvider(prov);
    setChainId(cid);

    const cfg = config[cid];
    if (!cfg?.D3scord?.address) {
      showToast("error", "Wrong network", `No D3scord contract on chain ${cid}. Run: npm run deploy:local`);
      return;
    }

    const ct = new ethers.Contract(cfg.D3scord.address, D3scordABI.abi, prov);
    setContract(ct);

    // Load channels
    const total = (await ct.totalChannels()).toNumber();
    const chs   = [];
    for (let i = 1; i <= total; i++) chs.push(await ct.getChannel(i));
    setChannels(chs);

    // Which channels has this wallet already joined?
    const j = new Set();
    for (const ch of chs) {
      const free = ch.cost.isZero();
      if (free || await ct.hasJoined(ch.id, acct)) j.add(ch.id.toString());
    }
    setJoined(j);
  }, [showToast]);

  /* ── connect wallet ── */
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      showToast("error", "MetaMask required", "Install MetaMask at metamask.io");
      return;
    }
    try {
      setBusy("Connecting wallet…");
      const accts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const acct  = ethers.utils.getAddress(accts[0]);
      setAccount(acct);
      await loadChain(acct);
      socket.connect();
      showToast("success", "Connected", `${acct.slice(0,6)}…${acct.slice(-4)}`);
    } catch (e) {
      showToast("error", "Connection failed", e.message);
    } finally {
      setBusy("");
    }
  }, [loadChain, showToast]);

  /* ── select / join channel (REAL on-chain tx for paid channels) ── */
  const selectChannel = useCallback(async (ch) => {
    if (!account) { showToast("error", "Not connected", "Connect your wallet first"); return; }

    const id = ch.id.toString();
    if (joined.has(id)) {
      // Already have access — just switch
      setCurrentCh(ch);
      setMessages([]);
      setOnline([]);
      socket.emit("join_channel", { channelId: id, account });
      return;
    }

    // Need to mint
    const eth = ethers.utils.formatEther(ch.cost);
    if (!window.confirm(`#${ch.name} costs ${eth} ETH.\nThis mints an NFT to your wallet on-chain.\n\nProceed?`)) return;

    try {
      setBusy(`Minting access to #${ch.name}…`);
      const signer = provider.getSigner();
      const tx     = await contract.connect(signer).mint(ch.id, { value: ch.cost });
      showToast("info", "TX submitted", "Waiting for confirmation…");
      await tx.wait();                         // waits for block confirmation

      setJoined(prev => new Set([...prev, id]));
      setCurrentCh(ch);
      setMessages([]);
      setOnline([]);
      socket.emit("join_channel", { channelId: id, account });
      showToast("success", "Joined!", `NFT minted. Welcome to #${ch.name}`);
    } catch (e) {
      showToast("error", "TX failed", e.reason || e.message);
    } finally {
      setBusy("");
    }
  }, [account, joined, contract, provider, showToast]);

  /* ── send message (real socket.io) ── */
  const sendMsg = useCallback((text) => {
    if (!text.trim() || !currentChRef.current || !account || !live) return;
    socket.emit("send_message", {
      channelId: currentChRef.current.id.toString(),
      account,
      text: text.trim(),
    });
  }, [account, live]);

  /* ── typing ── */
  const sendTyping = useCallback((isTyping) => {
    if (!currentChRef.current || !account) return;
    const ev = isTyping ? "typing_start" : "typing_stop";
    socket.emit(ev, { channelId: currentChRef.current.id.toString(), account });
  }, [account]);

  /* ── socket event listeners ── */
  useEffect(() => {
    socket.on("connect",    () => setLive(true));
    socket.on("disconnect", () => setLive(false));

    socket.on("history", ({ channelId, messages: msgs }) => {
      if (currentChRef.current?.id?.toString() === channelId) setMessages(msgs);
    });

    socket.on("message", (msg) => {
      if (currentChRef.current?.id?.toString() === msg.channelId)
        setMessages(prev => [...prev, msg]);
    });

    socket.on("online_users", ({ channelId, users }) => {
      if (currentChRef.current?.id?.toString() === channelId) setOnline(users);
    });

    socket.on("typing_start", ({ account: who }) =>
      setTyping(prev => [...new Set([...prev, who])]));

    socket.on("typing_stop", ({ account: who }) =>
      setTyping(prev => prev.filter(a => a !== who)));

    socket.on("reconnect", () => {
      showToast("info", "Reconnected", "Chat server back online");
      const ch = currentChRef.current;
      if (ch && account) socket.emit("join_channel", { channelId: ch.id.toString(), account });
    });

    return () => socket.removeAllListeners();
  }, [account, showToast]);

  /* ── MetaMask events ── */
  useEffect(() => {
    if (!window.ethereum) return;
    const onAccounts = (accts) => {
      if (!accts.length) { setAccount(null); setContract(null); setChannels([]); socket.disconnect(); }
      else window.location.reload();
    };
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged",    () => window.location.reload());
    return () => {
      window.ethereum.removeListener("accountsChanged", onAccounts);
    };
  }, []);

  /* ── Auto-reconnect if MetaMask already approved ── */
  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: "eth_accounts" }).then(accts => {
      if (accts.length) {
        const acct = ethers.utils.getAddress(accts[0]);
        setAccount(acct);
        loadChain(acct).then(() => socket.connect());
      }
    });
  }, [loadChain]);

  return (
    <div className="app">
      <Nav
        account={account} chainId={chainId} live={live}
        onConnect={connectWallet} busy={busy}
      />
      <div className="layout">
        <Sidebar />
        <ChannelPanel
          channels={channels} joined={joined}
          currentCh={currentCh} onSelect={selectChannel}
          account={account} busy={busy}
        />
        <ChatArea
          account={account} currentCh={currentCh}
          messages={messages} typing={typing} live={live}
          onSend={sendMsg} onTyping={sendTyping}
        />
        <MembersPanel online={online} currentCh={currentCh} />
      </div>

      {busy && (
        <div className="overlay">
          <div className="overlay__box">
            <div className="spinner" />
            <span>{busy}</span>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast--${toast.type}`}>
          <span className="toast__icon">
            {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}
          </span>
          <div>
            <b>{toast.title}</b>
            <p>{toast.msg}</p>
          </div>
        </div>
      )}
    </div>
  );
}
