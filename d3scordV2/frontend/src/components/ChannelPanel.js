import { ethers } from "ethers";

export default function ChannelPanel({ channels, joined, currentCh, onSelect, account, busy }) {
  return (
    <div className="ch-panel">
      <div className="ch-panel__head">D3scord</div>

      <div className="ch-panel__list">
        <div className="ch-panel__cat">Text Channels</div>

        {!account && <p className="ch-panel__hint">Connect wallet to see channels</p>}
        {account && channels.length === 0 && <p className="ch-panel__hint">Deploy contract first</p>}

        {channels.filter(c => c.isActive).map(ch => {
          const id       = ch.id.toString();
          const isJoined = joined.has(id);
          const isFree   = ch.cost.isZero();
          const isActive = currentCh?.id?.toString() === id;
          const costStr  = isFree ? null : `${ethers.utils.formatEther(ch.cost)}Ξ`;

          return (
            <div
              key={id}
              className={`ch-item ${isActive ? "ch-item--on" : ""} ${busy ? "ch-item--busy" : ""}`}
              onClick={() => !busy && onSelect(ch)}
              title={ch.description}
            >
              <span className="ch-item__hash">#</span>
              <span className="ch-item__name">{ch.name}</span>
              {costStr && (
                <span className={`ch-item__badge ${isJoined ? "ch-item__badge--ok" : ""}`}>
                  {isJoined ? "✓" : costStr}
                </span>
              )}
            </div>
          );
        })}

        <div className="ch-panel__cat" style={{marginTop:16}}>Voice Channels</div>
        {["lounge","gaming"].map(n => (
          <div key={n} className="ch-item ch-item--voice"
               onClick={() => alert("Voice needs WebRTC — not included in this build.")}>
            <span className="ch-item__hash">🔊</span>
            <span className="ch-item__name">{n}</span>
          </div>
        ))}
      </div>

      {account && (
        <div className="ch-panel__me">
          <div className="ch-panel__me-av">{account.slice(2,4).toUpperCase()}</div>
          <div>
            <div className="ch-panel__me-name">You</div>
            <code className="ch-panel__me-addr">{account.slice(0,6)}…{account.slice(-4)}</code>
          </div>
          <span className="ch-panel__me-dot" />
        </div>
      )}
    </div>
  );
}
