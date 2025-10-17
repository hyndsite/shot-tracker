export default function LiveLiteBar({ onMarkSet, onPlusAttempts, onPlusMake }) {
    const wrap = { position:'sticky', bottom:0, zIndex:20, background:'#0f172a', padding:8 }
    const row = { display:'flex', gap:8, justifyContent:'space-between' }
    const btn = (bg) => ({
      flex:1, padding:'12px 10px', border:'none', borderRadius:10, color:'white', background:bg, fontWeight:700
    })
    return (
      <div style={wrap}>
        <div style={row}>
          <button style={btn('#64748b')} onClick={onMarkSet}>Mark Set</button>
          <button style={btn('#22c55e')} onClick={onPlusAttempts}>+10 Attempts</button>
          <button style={btn('#06b6d4')} onClick={onPlusMake}>+Make</button>
        </div>
      </div>
    )
  }
  