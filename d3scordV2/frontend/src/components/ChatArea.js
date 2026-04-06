import { useEffect, useRef, useState } from "react";

const COLORS = ["#7c6cf0","#3ddc97","#f0a429","#f05252","#55a4f0","#f055d4","#55f0c8","#e8a23f"];
const hue  = a => COLORS[Math.abs([...a].reduce((h,c)=>(Math.imul(31,h)+c.charCodeAt(0))|0,0)) % COLORS.length];
const ts   = t => new Date(t).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
const addr = a => a ? `${a.slice(0,6)}…${a.slice(-4)}` : "?";

export default function ChatArea({ account, currentCh, messages, typing, live, onSend, onTyping }) {
  const [text,   setText]   = useState("");
  const [isTyp,  setIsTyp]  = useState(false);
  const timer    = useRef(null);
  const bottom   = useRef(null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, typing]);

  const handleInput = e => {
    setText(e.target.value);
    if (!isTyp) { setIsTyp(true); onTyping(true); }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setIsTyp(false); onTyping(false); }, 1500);
  };

  const submit = e => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
    clearTimeout(timer.current);
    setIsTyp(false);
    onTyping(false);
  };

  const canChat = !!account && !!currentCh && live;
  const others  = typing.filter(a => a?.toLowerCase() !== account?.toLowerCase());

  if (!currentCh) return (
    <div className="chat chat--empty">
      <div className="chat__welcome">
        <div style={{fontSize:64}}>⬡</div>
        <h2>Welcome to D3scord</h2>
        <p>{account ? "Pick a channel on the left" : "Connect MetaMask to start"}</p>
      </div>
    </div>
  );

  return (
    <div className="chat">
      <div className="chat__head">
        <span className="chat__head-hash">#</span>
        <b>{currentCh.name}</b>
        {currentCh.description && <span className="chat__head-desc">{currentCh.description}</span>}
        <span className={`chat__head-live ${live ? "chat__head-live--on" : ""}`}>{live ? "● Live" : "○ Reconnecting"}</span>
      </div>

      <div className="chat__msgs">
        {messages.length === 0 && (
          <div className="chat__start">
            <h3>#{currentCh.name}</h3>
            <p>This is the very beginning of #{currentCh.name}</p>
          </div>
        )}

        {messages.map((m, i) => {
          const self    = account && m.account?.toLowerCase() === account?.toLowerCase();
          const color   = hue(m.account || "");
          const initials= (m.account||"??").slice(2,4).toUpperCase();
          return (
            <div key={m.id||i} className={`msg ${self ? "msg--self" : ""}`}>
              <div className="msg__av" style={{background:color}}>{initials}</div>
              <div className="msg__body">
                <div className="msg__row">
                  <span className="msg__name" style={{color}}>{addr(m.account)}{self && <em> (you)</em>}</span>
                  <span className="msg__time">{ts(m.timestamp)}</span>
                </div>
                <div className="msg__text">{m.text}</div>
              </div>
            </div>
          );
        })}

        {others.length > 0 && (
          <div className="chat__typing">
            <span className="dots"><i/><i/><i/></span>
            {others.map(addr).join(", ")} {others.length===1?"is":"are"} typing…
          </div>
        )}
        <div ref={bottom}/>
      </div>

      <form className="chat__input" onSubmit={submit}>
        <input
          value={text} onChange={handleInput}
          onKeyDown={e => e.key==="Enter" && !e.shiftKey && submit(e)}
          placeholder={
            !account   ? "Connect wallet to chat…" :
            !live      ? "Connecting to server…"   :
            `Message #${currentCh.name}`
          }
          disabled={!canChat} maxLength={500} autoComplete="off"
        />
        <button type="submit" disabled={!canChat || !text.trim()}>➤</button>
      </form>
    </div>
  );
}
