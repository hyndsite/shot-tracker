import { useEffect, useState } from 'react'
import { getActiveGameForUser, getGameSessions } from '../lib/game-db'
import { getUser } from '../lib/supabase'
import dayjs from 'dayjs'

export default function GameGate({ onStartNew, onResume, onOpenDetail }) {
  const [user, setUser] = useState(null)
  const [active, setActive] = useState(null)
  const [groups, setGroups] = useState([])

  useEffect(() => {
    (async () => {
      const u = await getUser()
      setUser(u)

      if (u) setActive(await getActiveGameForUser(u.id))

      const all = await getGameSessions()
      const byLevel = all
        .filter(s => s.status === 'completed')
        .reduce((acc, s) => {
          acc[s.level] = acc[s.level] || []
          acc[s.level].push(s)
          return acc
        }, {})
      const levels = Object.keys(byLevel).sort()
      setGroups(levels.map(lvl => ({
        level: lvl,
        items: byLevel[lvl].sort((a,b)=> (b.dateISO||'').localeCompare(a.dateISO||''))
      })))
    })()
  }, [])

  if (!user) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-2">Game Mode</h2>
        <p className="text-sm text-gray-600">Please login on the Login page first.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <section className="card p-5">
        <h3 className="text-lg font-semibold mb-3">Start</h3>
        {active ? (
          <div className="flex flex-wrap gap-3">
            <button
              className="btn btn-brand"
              onClick={() => onResume(active)}
            >
              Resume Active Game
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => onStartNew()}
            >
              Start New Game
            </button>
          </div>
        ) : (
          <button
            className="btn btn-brand"
            onClick={() => onStartNew()}
          >
            New Game
          </button>
        )}
      </section>

      <section className="card p-5">
        <h3 className="text-lg font-semibold mb-3">Previous Games</h3>
        {groups.length === 0 && (
          <p className="text-sm text-gray-600">No completed games yet.</p>
        )}
        <div className="space-y-5">
          {groups.map(g => (
            <div key={g.level}>
              <div className="text-sm font-medium text-gray-700 mb-2">{g.level}</div>
              <ul className="divide-y rounded-lg border border-slate-200 bg-white">
                {g.items.map(it => (
                  <li key={it.id}>
                     <button 
                      className="list-link"
                      onClick={() => onOpenDetail(it)}
                      title="Open game detail"
                    >
                      {fmt(it.dateISO)} - {it.teamName} - {it.opponentName} - {it.homeAway}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function fmt(iso) {
  if (!iso) return '—'
  return dayjs(iso).format('YYYY-MM-DD')
}
