import { useEffect, useState } from "react"

// Bottom nav (lowercase path to match repo)
import BottomNav from "./components/BottomNav.jsx"

// Practice / analytics / account
import SessionLog from "./screens/SessionLog.jsx"
import YTDSummary from "./YTDSummary.jsx"
import Heatmap from "./Heatmap.jsx"
import Progression from "./Progression.jsx"
import GoalsManager from "./GoalsManager.jsx"
import Account from "./Account.jsx"
import PWAUpdateBanner from "./PWAUpdateBanner.jsx"

// Auth
import Login from "./screens/Login.jsx"

// Game flow
import ModeGate from "./screens/ModeGate.jsx"   // Practice vs Game chooser
import GameGate from "./screens/GameGate.jsx"   // Game hub: resume/start/previous
import GameNew from "./screens/GameNew.jsx"
import GameLogger from "./screens/GameLogger.jsx"
import GameDetail from "./screens/GameDetail.jsx"

// Supabase helpers
import { supabase, getUser } from "./lib/supabase.js"

function App() {
  // Primary tabs (BottomNav controls these)
  // 'log' | 'ytd' | 'goals' | 'heat' | 'prog' | 'game' | 'account' | 'login' (internal)
  const [tab, setTab] = useState("log")

  // Game sub-screens
  // 'mode' -> ModeGate | 'gate' -> GameGate | 'new' -> GameNew | 'logger' -> GameLogger | 'detail' -> GameDetail
  const [gameScreen, setGameScreen] = useState("mode")
  const [activeGame, setActiveGame] = useState(null)
  const [detailGame, setDetailGame] = useState(null)

  // Initial auth gate -> Login if not authenticated
  useEffect(() => {
    (async () => {
      const u = await getUser()
      if (!u) setTab("login")
    })()
  }, [])

  // After auth, land on Game -> ModeGate (you can change to 'log' if you prefer)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user) {
        setTab("game")
        setGameScreen("mode")
      }
    })
    return () => {
      try { sub.subscription?.unsubscribe?.() } catch {}
      try { sub?.unsubscribe?.() } catch {}
    }
  }, [])

  async function ensureAuthedOrGoLogin() {
    const u = await getUser()
    if (!u) { setTab("login"); return null }
    return u
  }

  async function handleTabSelect(next) {
    if (next === "game" || next === "account") {
      const u = await ensureAuthedOrGoLogin()
      if (!u) return
      if (next === "game") setGameScreen("mode")
    }
    setTab(next)
  }

  const showNav = tab !== "login"

  return (
    <div className="min-h-screen bg-white">
      <PWAUpdateBanner />

      <div className="content-pad">
        {tab === "login" && <Login />}

        {tab === "log" && <SessionLog />}

        {tab === "ytd" && <YTDSummary />}
        {tab === "heat" && <Heatmap />}
        {tab === "prog" && <Progression />}

        {tab === "goals" && <GoalsManager />}

        {tab === "account" && <Account />}

        {tab === "game" && (
          gameScreen === "mode" ? (
            <ModeGate
              onPractice={() => setTab("log")}
              onGame={() => setGameScreen("gate")}
            />
          ) : gameScreen === "gate" ? (
            <GameGate
              onStartNew={() => setGameScreen("new")}
              onResume={(session) => { setActiveGame(session); setGameScreen("logger") }}
              onOpenDetail={(session) => { setDetailGame(session); setGameScreen("detail") }}
            />
          ) : gameScreen === "new" ? (
            <GameNew onStarted={(session) => { setActiveGame(session); setGameScreen("logger") }} />
          ) : gameScreen === "logger" ? (
            <GameLogger session={activeGame} onEnd={() => { setActiveGame(null); setGameScreen("gate") }} />
          ) : gameScreen === "detail" ? (
            <GameDetail session={detailGame} onBack={() => setGameScreen("gate")} />
          ) : null
        )}
      </div>

      {showNav && <BottomNav active={tab} onChange={handleTabSelect} />}
    </div>
  )
}

export default App
