import { useEffect, useState } from "react"
import { Gamepad2, Brain } from "lucide-react"
import { getUser } from "../lib/supabase"

export default function ModeGate({ onPractice, onGame }) {
  const [user, setUser] = useState(null)
  useEffect(() => { (async () => setUser(await getUser()))() }, [])

  if (!user) {
    return (
      <div className="page">
        <h1 className="text-xl font-semibold mb-2">Select Mode</h1>
        <p className="muted">Please sign in first.</p>
      </div>
    )
  }

  return (
    <div className="page space-y-5">
      <header className="text-center">
        <h1 className="text-xl font-semibold">Select Mode</h1>
      </header>

      <section className="card p-6 text-center">
        <div className="flex flex-col items-center">
          <Gamepad2 className="h-12 w-12 text-[#17449e] mb-3" />
          <h2 className="text-2xl font-extrabold mb-2">Game Mode</h2>
          <p className="muted mb-6">Challenge yourself with competitive gameplay and review shot charts.</p>
          <button className="btn btn-primary" onClick={onGame}>Start Mode</button>
        </div>
      </section>

      <section className="card p-6 text-center">
        <div className="flex flex-col items-center">
          <Brain className="h-12 w-12 text-[#17449e] mb-3" />
          <h2 className="text-2xl font-extrabold mb-2">Practice Mode</h2>
          <p className="muted mb-6">Refine your skills in a no-pressure environment with customizable drills.</p>
          <button className="btn btn-primary" onClick={onPractice}>Start Mode</button>
        </div>
      </section>
    </div>
  )
}
