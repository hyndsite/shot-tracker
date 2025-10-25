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

      if (u) {
        const a = await getActiveGameForUser(u.id)
        setActive(a)
      }

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
        items: byLevel[lvl].sort((a,b)=> (b.dateISO||'').localeCompare(a.dateISO||'')),
      })))
    })()
  }, [])

  if (!user) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-2">Game Mode</h2>
        <p className="text-sm text-gray-600">Please login on the Account tab first.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="rounded border p-4">
        <h3 className="text-lg font-semibold mb-2">Start</h3>
        {active ? (
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded bg-black text-white"
              onClick={() => onResume(active)}
            >Resume Active Game</button>
            <button
              className="px-4 py-2 rounded border"
              onClick={() => onStartNew()}
            >Start New Game</button>
          </div>
        ) : (
          <button
            className="px-4 py-2 rounded bg-black text-white"
            onClick={() => onStartNew()}
          >New Game</button>
        )}
      </div>

      <div className="rounded border p-4">
        <h3 className="text-lg font-semibold mb-3">Previous Games</h3>
        {groups.length === 0 && <p className="text-sm text-gray-600">No completed games yet.</p>}
        <div className="space-y-4">
          {groups.map(g => (
            <div key={g.level}>
              <div className="text-sm font-medium text-gray-700 mb-2">{g.level}</div>
              <ul className="divide-y">
                {g.items.map(it => (
                  <li key={it.id}>
                    <button
                      className="w-full text-left py-2 hover:bg-gray-50"
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
      </div>
    </div>
  )
}

function fmt(iso) {
  if (!iso) return '—'
  return dayjs(iso).format('YYYY-MM-DD')
}
