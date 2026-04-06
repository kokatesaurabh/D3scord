export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__icon sidebar__icon--active" title="D3scord Main">⬡</div>
      <div className="sidebar__sep" />
      <div className="sidebar__icon" title="Add server" onClick={() => alert("Deploy a new D3scord contract to add a server.")}>+</div>
    </aside>
  );
}
