import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  getGoalSets, getGoalItems,
  upsertGoalSet, deleteGoalSet,
  upsertGoalItem, deleteGoalItem,
  migrateGoalSets_AddMode
} from './lib/db'
import { evaluateGoal } from './lib/goals-engine'

// ——— Small UI helpers ———
function Section({ title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 mb-4">
      {title && <h2 className="text-base font-semibold mb-2">{title}</h2>}
      {children}
    </div>
  )
}
const Badge = ({ children }) =>
  <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{children}</span>

const Pencil = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M3 21l3.75-.75L20.5 6.5a2.121 2.121 0 10-3-3L3.75 17.25 3 21z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
  </svg>
)

// ——— Goal type options (keep identical to your engine/types) ———
const GOAL_TYPES = [
  { id:'efg_threshold',  label:'eFG% (overall)', unit:'%' },
  { id:'three_pt',       label:'3P% (overall)',  unit:'%' },
  { id:'ft_pct',         label:'FT%',            unit:'%' },
  { id:'fg_zone',        label:'FG% by Zone',    unit:'%' },
  { id:'off_dribble_pct',label:'Off-Dribble FG%',unit:'%' },
  { id:'pressured_pct',  label:'Pressured FG%',  unit:'%' },
  { id:'weekly_makes',   label:'Makes (7 days)', unit:'makes' },
  { id:'attempts',       label:'Attempts (30 days)', unit:'attempts' },
]

// Pretty days-left text
function dueMeta(iso) {
  if (!iso) return null
  const d = dayjs(iso)
  const now = dayjs()
  const days = d.diff(now, 'day')
  return { label: d.format('MMM D, YYYY'), days }
}

export default function GoalsManager() {
  // Data
  const [sets, setSets] = useState([])
  const [items, setItems] = useState([])

  // Create/Edit Set form state
  const [editSetId, setEditSetId] = useState(null)
  const [setName, setSetName] = useState('')
  const [setDateISO, setSetDateISO] = useState('')
  const [setMode, setSetMode] = useState('practice') // NEW

  // Add Goal form state
  const [targetSetId, setTargetSetId] = useState('')
  const [goalType, setGoalType] = useState('efg_threshold')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalDetails, setGoalDetails] = useState('') // free text helper; your engine uses structured filter

  // Load + migrate
  useEffect(() => {
    (async () => {
      await migrateGoalSets_AddMode()
      const [s, it] = await Promise.all([getGoalSets(), getGoalItems()])
      setSets(s)
      setItems(it)
      if (s.length) setTargetSetId(s[0].id)
    })()
  }, [])

  // Derived: sets sorted by due date (soonest first; undated go last)
  const sortedSets = useMemo(() => {
    const withRank = sets.map(s => ({
      ...s,
      __rank: s.milestoneDateISO ? dayjs(s.milestoneDateISO).valueOf() : Infinity
    }))
    return withRank.sort((a,b) => a.__rank - b.__rank)
  }, [sets])

  // Group items by set
  const itemsBySet = useMemo(() => {
    const map = new Map()
    for (const it of items) {
      if (!map.has(it.setId)) map.set(it.setId, [])
      map.get(it.setId).push(it)
    }
    return map
  }, [items])

  // Handlers — Create/Edit Set
  const resetSetForm = () => {
    setEditSetId(null)
    setSetName('')
    setSetDateISO('')
    setSetMode('practice')
  }
  const loadSetIntoForm = (s) => {
    setEditSetId(s.id)
    setSetName(s.name || '')
    setSetDateISO(s.milestoneDateISO || '')
    setSetMode(s.mode || 'practice')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const saveSet = async () => {
    const saved = await upsertGoalSet({
      id: editSetId || undefined,
      name: setName.trim(),
      milestoneDateISO: setSetDateISO || null,
      mode: setMode
    })
    const fresh = await getGoalSets()
    setSets(fresh)
    if (!targetSetId) setTargetSetId(saved.id) // pick as default if none
    resetSetForm()
  }

  // Handlers — Add Goal
  const addGoal = async () => {
    if (!targetSetId) return
    await upsertGoalItem({
      setId: targetSetId,
      type: goalType,
      target: goalTarget ? Number(goalTarget) : 0,
      // You can map goalDetails into your engine filter shape later
      filter: { note: goalDetails || undefined }
    })
    setItems(await getGoalItems())
    setGoalTarget('')
    setGoalDetails('')
  }

  // UI
  return (
    <div className="mx-auto w-full max-w-[680px] px-3 pb-24 font-[system-ui]">
      <div className="py-3">
        <h1 className="text-lg font-semibold">Goal Management</h1>
      </div>

      {/* 1) Create/Edit Goal Set */}
      <Section title="Create New Goal Set">
        <div className="space-y-2">
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Set name (e.g., Preseason Block)"
            value={setName}
            onChange={e => setSetName(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={setMode}
              onChange={e => setSetMode(e.target.value)}
            >
              <option value="practice">Practice</option>
              <option value="game">Game</option>
            </select>
            <input
              type="date"
              className="w-full rounded border px-3 py-2 text-sm"
              value={setDateISO}
              onChange={e => setSetDateISO(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              className="ml-auto rounded bg-blue-600 text-white px-3 py-1.5 text-sm"
              onClick={saveSet}
            >
              {editSetId ? 'Save Set' : 'Create Set'}
            </button>
            {editSetId &&
              <button className="rounded border px-3 py-1.5 text-sm" onClick={resetSetForm}>
                Cancel
              </button>}
          </div>
        </div>
      </Section>

      {/* 2) Add Goal to Set */}
      <Section title="Add Goal to Set">
        <div className="space-y-2">
          <select
            className="w-full rounded border px-3 py-2 text-sm"
            value={targetSetId}
            onChange={e => setTargetSetId(e.target.value)}
          >
            {sortedSets.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} {s.mode ? `(${s.mode})` : ''}
              </option>
            ))}
          </select>

          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Goal Name (optional note)"
            value={goalDetails}
            onChange={e => setGoalDetails(e.target.value)}
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={goalType}
              onChange={e => setGoalType(e.target.value)}
            >
              {GOAL_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="Target Value (e.g., 42)"
              inputMode="decimal"
              value={goalTarget}
              onChange={e => setGoalTarget(e.target.value)}
            />
          </div>

          <button
            className="w-full rounded bg-blue-600 text-white px-3 py-2 text-sm"
            onClick={addGoal}
          >
            Add Goal
          </button>
        </div>
      </Section>

      {/* 3) Active Goal Sets (sorted by due date, grouped goals, pencil edit) */}
      <Section title="Active Goal Sets">
        <div className="space-y-3">
          {sortedSets.map(s => {
            const due = dueMeta(s.milestoneDateISO)
            const sItems = itemsBySet.get(s.id) || []

            return (
              <div key={s.id} className="rounded-xl border border-slate-200">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 p-3">
                  <div>
                    <div className="text-sm font-semibold">{s.name || 'Untitled Set'}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                      {due && (
                        <>
                          <span>📅 {due.label}</span>
                          <span className="text-slate-400">({due.days} days left)</span>
                        </>
                      )}
                      <Badge>{(s.mode || 'practice').replace(/^\w/, c => c.toUpperCase())}</Badge>
                    </div>
                  </div>
                  <button
                    className="shrink-0 p-1 text-slate-600 hover:text-slate-900"
                    aria-label="Edit set"
                    onClick={() => loadSetIntoForm(s)}
                  >
                    <Pencil />
                  </button>
                </div>

                {/* Goals list */}
                <div className="border-t border-slate-100">
                  {sItems.length === 0 && (
                    <div className="p-3 text-xs text-slate-500">No goals yet.</div>
                  )}

                  {sItems.map(it => {
                    const typeMeta = GOAL_TYPES.find(t => t.id === it.type)
                    const unit = typeMeta?.unit || ''
                    // Optional: evaluate current value to render a progress bar
                    // (You can wire evaluateGoal here with your entries.)
                    return (
                      <div key={it.id} className="flex items-start justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">
                            {typeMeta?.label || it.type}
                            {unit && <span className="ml-1 text-xs text-slate-500">({unit})</span>}
                          </div>
                          {it.filter?.note && (
                            <div className="text-xs text-slate-500 mt-0.5">{it.filter.note}</div>
                          )}
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            className="rounded border px-2 py-1 text-xs"
                            onClick={async () => {
                              // (Optionally load into a goal edit modal—kept minimal here)
                              // noop: placeholder for edit flow
                              alert('Editing individual Goal not implemented yet.')
                            }}
                          >Edit</button>
                          <button
                            className="rounded bg-rose-600 text-white px-2 py-1 text-xs"
                            onClick={async () => { await deleteGoalItem(it.id); setItems(await getGoalItems()) }}
                          >Delete</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </Section>
    </div>
  )
}
