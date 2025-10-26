import { useEffect, useState } from 'react'
import { addGameSession } from '../lib/game-db'
import { getUser } from '../lib/supabase'

const LEVELS = ['Middle School', 'High School', 'Club']
const HA = ['Home', 'Away']

export default function GameNew({ onStarted }) {
  const [dateISO, setDateISO] = useState(() => new Date().toISOString().slice(0,10))
  const [teamName, setTeamName] = useState('')
  const [opponentName, setOpponentName] = useState('')
  const [venue, setVenue] = useState('')
  const [level, setLevel] = useState(LEVELS[1])
  const [homeAway, setHomeAway] = useState('Home')
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const u = await getUser()
      setUserId(u?.id || null)
      setLoading(false)
    })()
  }, [])

  async function startGame(e) {
    e.preventDefault()
    if (!userId) return
    const session = {
      id: crypto.randomUUID(),
      userId,
      status: 'active',
      dateISO,
      teamName: teamName.trim(),
      opponentName: opponentName.trim(),
      venue: venue.trim(),
      level,
      homeAway,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await addGameSession(session)
    onStarted?.(session)
  }

  if (loading) return <div className="page muted">Loading…</div>
  if (!userId) {
    return (
      <div className="page">
        <h2 className="text-xl font-semibold mb-2">New Game</h2>
        <p className="muted">Please login on the Login page first.</p>
      </div>
    )
  }

  return (
    <form onSubmit={startGame} className="page space-y-3">
      <h2 className="text-xl font-semibold">New Game</h2>

      <label className="block">
        <span className="text-sm">Date</span>
        <input type="date" value={dateISO} onChange={e=>setDateISO(e.target.value)} className="ctl mt-1" />
      </label>

      <label className="block">
        <span className="text-sm">Your Team</span>
        <input value={teamName} onChange={e=>setTeamName(e.target.value)} className="ctl mt-1" placeholder="e.g., Panthers" required />
      </label>

      <label className="block">
        <span className="text-sm">Opponent</span>
        <input value={opponentName} onChange={e=>setOpponentName(e.target.value)} className="ctl mt-1" placeholder="e.g., Tigers" required />
      </label>

      <label className="block">
        <span className="text-sm">Venue</span>
        <input value={venue} onChange={e=>setVenue(e.target.value)} className="ctl mt-1" placeholder="e.g., Main Gym" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm">Level</span>
          <select value={level} onChange={e=>setLevel(e.target.value)} className="ctl mt-1">
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="text-sm">Home/Away</span>
          <select value={homeAway} onChange={e=>setHomeAway(e.target.value)} className="ctl mt-1">
            {HA.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </label>
      </div>

      <button className="btn btn-primary">Start Game</button>
    </form>
  )
}
