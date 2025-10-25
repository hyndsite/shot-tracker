import { useEffect, useState } from "react"
import { Gamepad2, Brain } from "lucide-react"
import { getUser } from "../lib/supabase"

export default function ModeGate({ onPractice, onGame }) {
  const [user, setUser] = useState(null)

  useEffect(() => { (async () => setUser(await getUser()))() }, [])

  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-2">Select Mode</h1>
        <p className="text-sm text-gray-600">Please sign in first.</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <header className="text-center mb-4">
        <h1 className="text-xl font-semibold">Select Mode</h1>
      </header>

      <div className="space-y-5">
        <ModeCard
          Icon={Gamepad2}
          title="Game Mode"
          subtitle="Challenge yourself with competitive gameplay and leaderboard rankings."
          cta="Start Mode"
          onClick={onGame}
        />

        <ModeCard
          Icon={Brain}
          title="Practice Mode"
          subtitle="Refine your skills in a no-pressure environment with customizable drills."
          cta="Start Mode"
          onClick={onPractice}
        />
      </div>
    </div>
  )
}

function ModeCard({ Icon, title, subtitle, cta, onClick }) {
  return (
    <div className="rounded-2xl border shadow-sm bg-white p-6">
      <div className="flex flex-col items-center text-center">
        <Icon className="h-12 w-12 text-[#17449e] mb-3" aria-hidden="true" />
        <h2 className="text-2xl font-extrabold mb-2">{title}</h2>
        <p className="text-gray-600 mb-6 leading-relaxed">{subtitle}</p>
        <button
          onClick={onClick}
          className="rounded-full bg-[#17449e] text-white px-6 py-3 text-base font-medium w-full sm:w-auto"
        >
          {cta}
        </button>
      </div>
    </div>
  )
}
