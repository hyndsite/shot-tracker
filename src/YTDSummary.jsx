import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { getEntries, getSessions } from './lib/db'
import { ZONES, SHOT_TYPES } from './constants'
import { efg } from './types'

function Table({ columns, rows }) {
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ borderCollapse:'collapse', width:'100%' }}>
        <thead>
          <tr>
            {columns.map(c=>(
              <th key={c.key} style={{ textAlign:'left', padding:'8px 6px', borderBottom:'1px solid #e5e7eb' }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>
              {columns.map(c=>(
                <td key={c.key} style={{ padding:'6px', borderBottom:'1px solid #f1f5f9' }}>
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function YTDSummary() {
  const [sessions, setSessions] = useState([])
  const [entries, setEntries] = useState([])

  useEffect(() => {
    const load = async () => {
      setSessions(await getSessions())
      setEntries(await getEntries())
    }
    load()
  }, [])

  const startOfYear = dayjs().startOf('year')
  const ytdEntries = useMemo(() => {
    const sessionIdsThisYear = new Set(
      sessions.filter(s => dayjs(s.dateISO).isAfter(startOfYear) || dayjs(s.dateISO).isSame(startOfYear))
              .map(s => s.id)
    )
    return entries.filter(e => sessionIdsThisYear.has(e.sessionId))
  }, [sessions, entries, startOfYear])

  const totals = useMemo(() => {
    return ytdEntries.reduce((acc,e)=>{
      acc.attempts += e.attempts
      acc.makes += e.makes
      if (e.isThree) acc.threesMade += e.makes
      return acc
    }, { attempts:0, makes:0, threesMade:0 })
  }, [ytdEntries])

  // By Zone
  const zoneMap = new Map()
  ytdEntries.forEach(e => {
    const key = e.zoneId
    if (!zoneMap.has(key)) zoneMap.set(key, { attempts:0, makes:0, threesMade:0 })
    const t = zoneMap.get(key)
    t.attempts += e.attempts
    t.makes += e.makes
    if (e.isThree) t.threesMade += e.makes
  })
  const zoneRows = Array.from(zoneMap.entries()).map(([zoneId, t]) => {
    const z = ZONES.find(z => z.id === zoneId)
    return {
      zone: z?.label || zoneId,
      attempts: t.attempts,
      makes: t.makes,
      fg: t.attempts ? ((t.makes / t.attempts) * 100).toFixed(1) + '%' : '—',
      efg: t.attempts ? ((efg(t) * 100).toFixed(1) + '%') : '—'
    }
  }).sort((a,b)=> (b.attempts - a.attempts))

  // By Shot Type
  const typeMap = new Map()
  ytdEntries.forEach(e => {
    const key = e.shotType
    if (!typeMap.has(key)) typeMap.set(key, { attempts:0, makes:0, threesMade:0 })
    const t = typeMap.get(key)
    t.attempts += e.attempts
    t.makes += e.makes
    if (e.isThree) t.threesMade += e.makes
  })
  const typeRows = Array.from(typeMap.entries()).map(([st, t]) => {
    const label = SHOT_TYPES.find(s => s.id === st)?.label || st
    return {
      shotType: label,
      attempts: t.attempts,
      makes: t.makes,
      fg: t.attempts ? ((t.makes / t.attempts) * 100).toFixed(1) + '%' : '—',
      efg: t.attempts ? ((efg(t) * 100).toFixed(1) + '%') : '—'
    }
  }).sort((a,b)=> (b.attempts - a.attempts))

  return (
    <div style={{ padding:16, fontFamily:'system-ui, -apple-system, Segoe UI, Roboto', maxWidth:900, margin:'0 auto' }}>
      <h2 style={{ marginBottom:6 }}>YTD Summary ({dayjs().year()})</h2>
      <div style={{ marginBottom:12, padding:12, background:'#f6f7fb', borderRadius:10 }}>
        <div>Attempts: <b>{totals.attempts}</b> · Makes: <b>{totals.makes}</b> · eFG%: <b>{(efg(totals)*100).toFixed(1)}%</b></div>
      </div>

      <h3 style={{ margin:'8px 0' }}>By Zone</h3>
      <Table
        columns={[
          { key:'zone', label:'Zone' },
          { key:'attempts', label:'Att' },
          { key:'makes', label:'Makes' },
          { key:'fg', label:'FG%' },
          { key:'efg', label:'eFG%' }
        ]}
        rows={zoneRows}
      />

      <h3 style={{ margin:'12px 0 6px' }}>By Shot Type</h3>
      <Table
        columns={[
          { key:'shotType', label:'Shot Type' },
          { key:'attempts', label:'Att' },
          { key:'makes', label:'Makes' },
          { key:'fg', label:'FG%' },
          { key:'efg', label:'eFG%' }
        ]}
        rows={typeRows}
      />
    </div>
  )
}
