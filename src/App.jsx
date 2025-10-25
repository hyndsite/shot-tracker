import { useEffect, useState } from "react"
import BottomNav from "./components/BottomNav"

import SessionLog from "./screens/SessionLog"
import YTDSummary from "./YTDSummary"
import Heatmap from "./Heatmap"
import Progression from "./Progression"
import GoalsManager from "./GoalsManager"
import Account from "./Account"
import PWAUpdateBanner from "./PWAUpdateBanner"

// New
import Login from "./screens/Login"

// Game mode
import GameGate from "./screens/GameGate"
import GameNew from "./screens/GameNew"
import GameLogger from "./screens/GameLogger"
import GameDetail from "./screens/GameDetail"

import { supabase, getUser } from "./lib/supabase"

function App() {
  // Include 'login' as an internal page
  const [tab, setTab] = useState("log")
  const [gameRoute, setGameRoute] = useState("gate")
  const [activeGame, setActiveGame] = useState(null)
  const [detailGame, setDetailGame] = useState(null)

  // Boot: send unauthenticated users to Login (not Account)
  useEffect(() => {
    (async () => {
      const u = await getUser()
      if (!u) setTab("login")
    })()
  }, [])

  // After auth, route to Game→Gate (or change to 'log' if you prefer)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user) {
        setTab("game")
        setGameRoute("gate")
      }
    })
    return () => {
      try { sub.subscription?.unsubscribe?.() } catch {}
      try { sub?.unsubscribe?.() } catch {}
    }
  }, [])

  // BottomNav handler
  async function handleTabChange(next) {
    if (next === "game" || next === "account") {
      const u = await getUser()
      if (!u) { setTab("login"); return } // redirect to Login if logged out
      if (next === "game") setGameRoute("gate")
    }
    setTab(next)
  }

  // Hide BottomNav on Login screen for a clean look (optional)
  const showNav = tab !== "login"

  return (
    <div className="min-h-screen bg-white">
      <PWAUpdateBanner />

      <div className="pb-20">
        {tab === "login" && <Login onSent={() => { /* optional toast */ }} />}

        {tab === "log" && <SessionLog />}

        {tab === "ytd" && <YTDSummary />}
        {tab === "heat" && <Heatmap />}
        {tab === "prog" && <Progression />}

        {tab === "goals" && <GoalsManager />}

        {tab === "account" && <Account />}

        {tab === "game" && (
          gameRoute === "gate" ? (
            <GameGate
              onStartNew={() => setGameRoute("new")}
              onResume={(session) => { setActiveGame(session); setGameRoute("logger") }}
              onOpenDetail={(session) => { setDetailGame(session); setGameRoute("detail") }}
            />
          ) : gameRoute === "new" ? (
            <GameNew onStarted={(session) => { setActiveGame(session); setGameRoute("logger") }} />
          ) : gameRoute === "logger" ? (
            <GameLogger session={activeGame} onEnd={() => { setActiveGame(null); setGameRoute("gate") }} />
          ) : gameRoute === "detail" ? (
            <GameDetail session={detailGame} onBack={() => setGameRoute("gate")} />
          ) : null
        )}
      </div>

      {showNav && <BottomNav active={tab} onChange={handleTabChange} />}
    </div>
  )
}

export default App
