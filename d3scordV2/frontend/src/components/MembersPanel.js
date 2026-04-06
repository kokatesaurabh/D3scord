const COLORS = ["#7c6cf0","#3ddc97","#f0a429","#f05252","#55a4f0","#f055d4","#55f0c8","#e8a23f"];
const hue = a => COLORS[Math.abs([...a].reduce((h,c)=>(Math.imul(31,h)+c.charCodeAt(0))|0,0)) % COLORS.length];

export default function MembersPanel({ online, currentCh }) {
  return (
    <div className="members">
      <div className="members__head">Members</div>
      {online.length > 0
        ? <>
            <div className="members__cat">Online — {online.length}</div>
            {online.map((a,i) => (
              <div key={i} className="member">
                <div className="member__av" style={{background:hue(a)}}>
                  {a.slice(2,4).toUpperCase()}
                  <div className="member__dot"/>
                </div>
                <code className="member__addr">{a.slice(0,6)}…{a.slice(-4)}</code>
              </div>
            ))}
          </>
        : <p className="members__empty">{currentCh ? "No one else here yet" : "Select a channel"}</p>
      }
    </div>
  );
}
