import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { getEntries, getGoals, upsertGoal } from './lib/db'
import { efg } from './types'

export default function Goals() {
  const [entries, setEntries] = useState([])
  const [goals, setGoals] = useState([])
  const [efgTarget, setEfgTarget] = useState(55)     // percent
  const [weeklyMakesTarget, setWeeklyMakesTarget] = useState(500)

  useEffect(() => {
    const load = async () => {
      setEntries(await getEntries())
      const g = await getGoals()
      setGoals(g)
      const gE = g.find(x => x.type === 'efg_threshold')
      const gM = g.find(x => x.type === 'weekly_makes')
      if (gE) setEfgTarget(gE.target)
      if (gM) setWeeklyMakesTarget(gM.target)
    }
    load()
  }, [])

  const last7Start = dayjs().subtract(6, 'day').startOf('day')
  const last30Start = dayjs().subtract(29, 'day').startOf('day')

  const entries7 = useMemo(() => entries.filter(e => dayjs(e.ts).isAfter(last7Start)), [entries, last7Start])
  const entries30 = useMemo(() => entries.filter(e => dayjs(e.ts).isAfter(last30Start)), [entries, last30Start])

  const totals7 = entries7.reduce((acc,e)=>{acc.attempts+=e.attempts; acc.makes+=e.makes; if(e.isThree) acc.threesMade+=e.makes; return acc},{attempts:0,makes:0,threesMade:0})
  const totals30= entries30.reduce((acc,e)=>{acc.attempts+=e.attempts; acc.makes+=e.makes; if(e.isThree) acc.threesMade+=e.makes; return acc},{attempts:0,makes:0,threesMade:0})

  const efg7 = efg(totals7) * 100
  const makes7 = totals7.makes
  const efg30 = efg(totals30) * 100

  const saveGoals = async () => {
    await upsertGoal({ type:'efg_threshold', target: Number(efgTarget) })
    await upsertGoal({ type:'weekly_makes', target: Number(weeklyMakesTarget) })
    setGoals(await getGoals())
  }

  const bar = (val, target, label) => {
    const pct = target ? Math.min(100, (val/target)*100) : 0
    return (
      <div style={{ margin:'6px 0' }}>
        <div style={{ fontSize:14, marginBottom:4 }}>{label}: <b>{val.toFixed ? val.toFixed(1) : val}</b> / {target}</div>
        <div style={{ height:10, background:'#e5e7eb', borderRadius:6, overflow:'hidden' }}>
          <div style={{ width:`${pct}%`, height:'100%', background:pct>=100 ? '#22c55e' : '#0ea5e9' }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding:16, fontFamily:'system-ui, -apple-system, Segoe UI, Roboto', maxWidth:720, margin:'0 auto' }}>
      <h2>Goals</h2>

      <div style={{ marginTop:8, padding:12, border:'1px solid #e5e7eb', borderRadius:10 }}>
        <h3 style={{ marginTop:0 }}>Targets</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <label>eFG% Target
            <input type="number" value={efgTarget} onChange={e=>setEfgTarget(e.target.value)} style={{ width:'100%', marginTop:4 }} />
          </label>
          <label>Weekly Makes Target
            <input type="number" value={weeklyMakesTarget} onChange={e=>setWeeklyMakesTarget(e.target.value)} style={{ width:'100%', marginTop:4 }} />
          </label>
        </div>
        <button onClick={saveGoals} style={{ marginTop:12, padding:'10px 14px', borderRadius:8 }}>Save Targets</button>
      </div>

      <div style={{ marginTop:16, padding:12, background:'#f6f7fb', borderRadius:10 }}>
        <h3 style={{ marginTop:0 }}>Progress</h3>
        {bar(efg7, efgTarget, 'eFG% (7-day)')}
        {bar(makes7, weeklyMakesTarget, 'Makes (7-day)')}
        <div style={{ marginTop:8, fontSize:12, color:'#555' }}>
          30-day eFG% reference: <b>{efg30.toFixed(1)}%</b>
        </div>
      </div>
    </div>
  )
}
