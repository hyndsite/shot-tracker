// src/Progression.jsx
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  ResponsiveContainer,
  LineChart, Line,
  XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from 'recharts'
import { getEntries } from './lib/db'

// eFG% helper – weights 3s by 1.5 (standard)
function calcEfg({ makes, attempts, threesMade }) {
  if (!attempts) return 0
  return ( (makes - threesMade) + 1.5 * threesMade ) / attempts
}

const ranges = [
  { key: '30d', label: '30d', days: 30 },
  { key: '60d', label: '60d', days: 60 },
  { key: '180d', label: '180d', days: 180 },
  { key: 'all', label: 'All', days: Infinity },
]

export default function Progression() {
  const [entries, setEntries] = useState([])
  const [range, setRange]   = useState('60d') // default like the wireframe
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const e = await getEntries()
      setEntries(e)
      setLoading(false)
    })()
  }, [])

  // Aggregate to daily buckets
  const daily = useMemo(() => {
    if (!entries?.length) return []
    const byDay = new Map()
    for (const e of entries) {
      const d = dayjs(e.ts).format('YYYY-MM-DD')
      let rec = byDay.get(d)
      if (!rec) { rec = { dateISO: d, attempts: 0, makes: 0, threesMade: 0 } ; byDay.set(d, rec) }
      rec.attempts += Number(e.attempts || 0)
      rec.makes    += Number(e.makes || 0)
      if (e.isThree) rec.threesMade += Number(e.makes || 0)
    }
    // Build sorted array
    return [...byDay.values()]
      .sort((a,b) => a.dateISO.localeCompare(b.dateISO))
      .map(r => ({
        dateISO: r.dateISO,
        label: dayjs(r.dateISO).format('MMM D'),
        efg: Number((calcEfg(r) * 100).toFixed(1)),
        attempts: r.attempts,
        makes: r.makes
      }))
  }, [entries])

  // Filter by selected range
  const data = useMemo(() => {
    if (!daily.length) return []
    if (range === 'all') return daily
    const days = ranges.find(r => r.key === range)?.days ?? 60
    const cutoff = dayjs().subtract(days, 'day')
    return daily.filter(d => dayjs(d.dateISO).isAfter(cutoff))
  }, [daily, range])

  // Overall average for reference line
  const avg = useMemo(() => {
    if (!data.length) return null
    const sum = data.reduce((a, d) => a + d.efg, 0)
    return Number((sum / data.length).toFixed(1))
  }, [data])

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 pb-24 text-slate-900">
      {/* Header */}
      <header className="mb-3">
        <h2 className="text-xl font-bold">Progress</h2>
        <p className="muted">Daily eFG% trend over time</p>
      </header>

      {/* Range selector */}
      <div className="flex flex-wrap gap-2 mb-3">
        {ranges.map(r => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`seg ${range === r.key ? 'seg-on' : 'seg-off'}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Chart card */}
      <section className="chart-card">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : !data.length ? (
          <div className="empty">No data yet. Log some shots to see progress.</div>
        ) : (
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#0f172a', fontSize: 12 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#0f172a', fontSize: 12 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                  tickFormatter={(v)=>`${v}%`}
                />
                {avg != null && (
                  <ReferenceLine y={avg} stroke="#94a3b8" strokeDasharray="4 4" />
                )}
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#0f172a' }}
                  labelStyle={{ color: '#334155' }}
                  formatter={(value, name, props) => {
                    if (name === 'efg') return [`${value}%`, 'eFG']
                    return [value, name]
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="efg"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 2, stroke: '#2563eb', fill: '#2563eb' }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Footer stats row */}
        {data.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg border border-slate-200 p-2">
              <div className="text-xs text-slate-500">Days</div>
              <div className="font-semibold">{data.length}</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-2">
              <div className="text-xs text-slate-500">Avg eFG</div>
              <div className="font-semibold">{avg}%</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-2">
              <div className="text-xs text-slate-500">Best Day</div>
              <div className="font-semibold">
                {Math.max(...data.map(d => d.efg)).toFixed(1)}%
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}