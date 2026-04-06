const CHAINS = { 1:"Ethereum", 5:"Goerli", 11155111:"Sepolia", 137:"Polygon", 42161:"Arbitrum", 31337:"Hardhat Local" };

export default function Nav({ account, chainId, live, onConnect, busy }) {
  const short = account ? `${account.slice(0,6)}…${account.slice(-4)}` : null;
  return (
    <nav className="nav">
      <div className="nav__brand">
        <span className="nav__hex">⬡</span>
        <h1>D3scord</h1>
        <span className="nav__tag">// Web3 Chat</span>
      </div>
      <div className="nav__pills">
        {chainId && <span className="pill pill--purple">{CHAINS[chainId] || `Chain ${chainId}`}</span>}
        <span className={`pill ${live ? "pill--green" : "pill--red"}`}>{live ? "● Live" : "○ Offline"}</span>
      </div>
      <div className="nav__right">
        {account ? (
          <div className="nav__user">
            <div className="nav__avatar">{account.slice(2,4).toUpperCase()}</div>
            <code className="nav__addr">{short}</code>
          </div>
        ) : (
          <button className="btn-connect" onClick={onConnect} disabled={!!busy}>
            {busy ? "…" : "Connect Wallet"}
          </button>
        )}
      </div>
    </nav>
  );
}
