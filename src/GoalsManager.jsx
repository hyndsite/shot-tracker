import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  getEntries, getGoalSets, getGoalItems,
  upsertGoalSet, deleteGoalSet, upsertGoalItem, deleteGoalItem
} from './lib/db'
import { evaluateGoal } from './lib/goals-db'
import { ZONES, SHOT_TYPES } from './constants'
import { pushAllLocal, pullAllRemote } from './lib/sync'

const GOAL_TYPES = [
  { id:'efg_threshold',  label:'eFG% (overall)', unit:'%' },
  { id:'three_pt',       label:'3P% (overall)',  unit:'%' , preset:{ filter:{ isThree:true, period:'30d'} }},
  { id:'ft_pct',         label:'FT%',            unit:'%' , preset:{ filter:{ zone:'free_throw', period:'30d'} }},
  { id:'fg_zone',        label:'FG% by Zone',    unit:'%' , preset:{ filter:{ zone:'corner_left', period:'30d'} }},
  { id:'off_dribble_pct',label:'Off-Dribble FG%',unit:'%' , preset:{ filter:{ shotType:'off_dribble', period:'30d'} }},
  { id:'pressured_pct',  label:'Pressured FG%',  unit:'%' , preset:{ filter:{ pressured:true, period:'30d'} }},
  { id:'weekly_makes',   label:'Makes (7 days)', unit:'makes', preset:{ filter:{ period:'7d'} }},
  { id:'attempts',       label:'Attempts (30 days)', unit:'attempts', preset:{ filter:{ period:'30d'} }}
]

function Card({ children }) {
  return <div style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:12, marginBottom:12 }}>{children}</div>
}

export default function GoalsManager() {
  const [entries, setEntries] = useState([])
  const [sets, setSets] = useState([])
  const [items, setItems] = useState([])
  const [activeSetId, setActiveSetId] = useState('')
  const [formSet, setFormSet] = useState({ name:'', milestoneDate: dayjs().add(30,'day').format('YYYY-MM-DD') })

  useEffect(() => {
    (async () => {
      setEntries(await getEntries())
      const s = await getGoalSets()
      const i = await getGoalItems()
      setSets(s)
      setItems(i)
      if (s.length && !activeSetId) setActiveSetId(s[0].id)
    })()
  }, [])

  const activeSet = useMemo(() => sets.find(s => s.id === activeSetId) || null, [sets, activeSetId])
  const activeItems = useMemo(() => items.filter(i => i.setId === activeSetId), [items, activeSetId])

  // ---- create & edit set
  const createSet = async () => {
    const gs = { id: crypto.randomUUID(), name: formSet.name || 'Goal Set', milestoneDate: formSet.milestoneDate }
    await upsertGoalSet(gs)
    setSets(prev => [gs, ...prev])
    setActiveSetId(gs.id)
  }
  const updateSet = async () => {
    if (!activeSet) return
    const upd = { ...activeSet, name: formSet.name || activeSet.name, milestoneDate: formSet.milestoneDate || activeSet.milestoneDate }
    await upsertGoalSet(upd)
    setSets(prev => [upd, ...prev.filter(s => s.id !== upd.id)])
  }
  const removeSet = async () => {
    if (!activeSet) return
    await deleteGoalSet(activeSet.id)
    setSets(prev => prev.filter(s => s.id !== activeSet.id))
    setItems(prev => prev.filter(it => it.setId !== activeSet.id))
    setActiveSetId(sets.find(s => s.id !== activeSet.id)?.id || '')
  }

  // ---- create item
  const [newItem, setNewItem] = useState({
    type:'efg_threshold',
    target:55,
    comparison:'greater_equal',
    filter:{ period:'30d', zone:'all', shotType:'any' }
  })
  const addItem = async () => {
    if (!activeSet) return
    const gi = { id: crypto.randomUUID(), setId: activeSet.id, ...newItem, target: Number(newItem.target) }
    await upsertGoalItem(gi)
    setItems(prev => [gi, ...prev])
  }
  const removeItem = async (id) => {
    await deleteGoalItem(id)
    setItems(prev => prev.filter(x => x.id !== id))
  }

  const milestone = activeSet?.milestoneDate
  const today = dayjs()
  const daysLeft = milestone ? dayjs(milestone).startOf('day').diff(today.startOf('day'), 'day') : null

  // ---- UI
  return (
    <div style={{ padding:16, fontFamily:'system-ui, -apple-system, Segoe UI, Roboto', maxWidth:900, margin:'0 auto' }}>
      <h2>Goal Sets</h2>

      <Card>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <label>Active Set:{' '}
            <select value={activeSetId} onChange={e=>setActiveSetId(e.target.value)}>
              <option value="">— none —</option>
              {sets.map(s => <option key={s.id} value={s.id}>{s.name} · due {dayjs(s.milestoneDate).format('MMM D, YYYY')}</option>)}
            </select>
          </label>

          <button onClick={async ()=>{ await pullAllRemote(); setSets(await getGoalSets()); setItems(await getGoalItems()); }} style={{ padding:'8px 12px', borderRadius:8 }}>
            Pull from Cloud
          </button>
          <button onClick={async ()=>{ await pushAllLocal(); }} style={{ padding:'8px 12px', borderRadius:8 }}>
            Push to Cloud
          </button>
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop:0 }}>Create / Edit Set</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 200px 140px', gap:8 }}>
          <input placeholder="Set name (e.g., Preseason Block)" value={formSet.name} onChange={e=>setFormSet({...formSet, name:e.target.value})} />
          <input type="date" value={formSet.milestoneDate} onChange={e=>setFormSet({...formSet, milestoneDate:e.target.value})} />
          <button onClick={createSet}>Create Set</button>
        </div>

        {activeSet && (
          <div style={{ marginTop:10, display:'grid', gridTemplateColumns:'1fr 200px 140px 120px', gap:8 }}>
            <input placeholder="Rename active set" defaultValue={activeSet.name} onChange={e=>setFormSet({...formSet, name:e.target.value})} />
            <input type="date" defaultValue={activeSet.milestoneDate} onChange={e=>setFormSet({...formSet, milestoneDate:e.target.value})} />
            <button onClick={updateSet}>Save Changes</button>
            <button onClick={removeSet} style={{ background:'#fee2e2' }}>Delete Set</button>
          </div>
        )}

        {activeSet && (
          <div style={{ marginTop:8, fontSize:12, color:'#475569' }}>
            Milestone: <b>{dayjs(activeSet.milestoneDate).format('MMM D, YYYY')}</b> · {daysLeft !== null ? (daysLeft >= 0 ? `${daysLeft} days left` : `${Math.abs(daysLeft)} days past`) : ''}
          </div>
        )}
      </Card>

      {activeSet && (
        <Card>
          <h3 style={{ marginTop:0 }}>Add Goal to Set</h3>
          <div style={{ display:'grid', gridTemplateColumns:'220px 120px 160px 1fr 120px', gap:8, alignItems:'center' }}>
            <select
              value={newItem.type}
              onChange={e=>{
                const t = e.target.value
                const preset = (GOAL_TYPES.find(g=>g.id===t)?.preset) || {}
                setNewItem(ni=>({ ...ni, type:t, filter:{ ...ni.filter, ...preset.filter } }))
              }}
            >
              {GOAL_TYPES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>

            <input type="number" value={newItem.target} onChange={e=>setNewItem({...newItem, target:e.target.value})} />
            <select value={newItem.comparison} onChange={e=>setNewItem({...newItem, comparison:e.target.value})}>
              <option value="greater_equal">≥ target</option>
              <option value="less_equal">≤ target</option>
              <option value="equal">= target</option>
            </select>

            {/* Filters */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <label>Period:
                <select value={newItem.filter.period ?? '30d'} onChange={e=>setNewItem({...newItem, filter:{...newItem.filter, period:e.target.value}})}>
                  <option value="7d">7d</option>
                  <option value="30d">30d</option>
                  <option value="365d">365d</option>
                  <option value="all">All</option>
                </select>
              </label>
              <label>Zone:
                <select value={newItem.filter.zone ?? 'all'} onChange={e=>setNewItem({...newItem, filter:{...newItem.filter, zone:e.target.value}})}>
                  <option value="all">All</option>
                  {ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
                </select>
              </label>
              <label>Shot:
                <select value={newItem.filter.shotType ?? 'any'} onChange={e=>setNewItem({...newItem, filter:{...newItem.filter, shotType:e.target.value}})}>
                  <option value="any">Any</option>
                  {SHOT_TYPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <label>Pressured:
                <select value={(newItem.filter.pressured ?? 'any').toString()} onChange={e=>{
                  const v = e.target.value === 'any' ? null : (e.target.value === 'true')
                  setNewItem({...newItem, filter:{...newItem.filter, pressured:v}})
                }}>
                  <option value="any">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
            </div>

            <button onClick={addItem}>Add Goal</button>
          </div>
        </Card>
      )}

      {activeSet && (
        <Card>
          <h3 style={{ marginTop:0 }}>Goals in “{activeSet.name}”</h3>
          {activeItems.length === 0 && <div>No goals yet.</div>}
          {activeItems.map(item => {
            const res = evaluateGoal(entries, item, activeSet.milestoneDate)
            const pct = isFinite(res.pctToTarget) ? res.pctToTarget : 0
            return (
              <div key={item.id} style={{ display:'grid', gridTemplateColumns:'1fr 120px 200px 100px 80px', gap:8, alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontWeight:600 }}>{(GOAL_TYPES.find(g=>g.id===item.type)?.label) || item.type}</div>
                  <div style={{ fontSize:12, color:'#64748b' }}>
                    period <b>{item.filter?.period || 'all'}</b>
                    {item.filter?.zone && item.filter.zone!=='all' ? <> · zone <b>{item.filter.zone}</b></> : null}
                    {item.filter?.shotType && item.filter.shotType!=='any' ? <> · shot <b>{item.filter.shotType}</b></> : null}
                    {typeof item.filter?.pressured === 'boolean' ? <> · pressured <b>{item.filter.pressured ? 'yes' : 'no'}</b></> : null}
                  </div>
                </div>

                <div>Target: <b>{item.target}</b></div>

                <div>
                  <div style={{ height:10, background:'#e5e7eb', borderRadius:6, overflow:'hidden' }}>
                    <div style={{ width:`${Math.min(100, pct)}%`, height:'100%', background: res.met ? '#22c55e' : '#0ea5e9' }} />
                  </div>
                  <div style={{ fontSize:12, color:'#64748b' }}>
                    Value: <b>{Number(res.value).toFixed(1)}</b> · {res.met ? '✅ Met' : '⏳ In progress'}
                  </div>
                </div>

                <button onClick={async ()=>{ 
                  const target = Number(prompt('New target?', item.target))
                  if (!Number.isFinite(target)) return
                  const updated = { ...item, target }
                  await upsertGoalItem(updated)
                  setItems(prev => [updated, ...prev.filter(x => x.id !== updated.id)])
                }}>Edit</button>

                <button onClick={()=>removeItem(item.id)} style={{ background:'#fee2e2' }}>Delete</button>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
