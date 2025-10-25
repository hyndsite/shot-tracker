// src/App.jsx
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

// Auth screens
import Login from "./screens/Login.jsx"

// Game flow screens
import ModeGate from "./screens/ModeGate.jsx"   // new: Practice vs Game chooser
import GameGate from "./screens/GameGate.jsx"   // game hub: resume/start/previous
import GameNew from "./screens/GameNew.jsx"
import GameLogger from "./screens/GameLogger.jsx"
import GameDetail from "./screens/GameDetail.jsx"

// Supabase helpers you actually export
import { supabase, getUser } from "./lib/supabase.js"

function App() {
  /**
   * Primary nav tab (what BottomNav controls)
   * 'log' | 'ytd' | 'goals' | 'heat' | 'prog' | 'game' | 'account' | 'login' (internal)
   */
  const [tab, setTab] = useState("log")

  /**
   * Game area sub-screen (internal state machine for Game tab)
   * 'mode' -> ModeGate (Practice vs Game)
   * 'gate' -> GameGate  (resume/start/previous)
   * 'new'  -> GameNew   (new game form)
   * 'logger' -> GameLogger (active game)
   * 'detail' -> GameDetail (read-only view)
   */
  const [gameScreen, setGameScreen] = useState("mode")
  const [activeGame, setActiveGame] = useState(null)
  const [detailGame, setDetailGame] = useState(null)

  // Redirect unauthenticated users to Login on initial load.
  useEffect(() => {
    (async () => {
      const u = await getUser()
      if (!u) setTab("login")
    })()
  }, [])

  // After auth change -> land on Game tab, ModeGate first.
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

  // Helper: ensure auth, otherwise send to Login
  async function ensureAuthedOrGoLogin() {
    const u = await getUser()
    if (!u) {
      setTab("login")
      return null
    }
    return u
  }

  // BottomNav handler
  async function handleTabSelect(next) {
    if (next === "game" || next === "account") {
      const u = await ensureAuthedOrGoLogin()
      if (!u) return
      if (next === "game") setGameScreen("mode") // always enter at ModeGate
    }
    setTab(next)
  }

  // Hide nav on Login for a clean look
  const showNav = tab !== "login"

  return (
    <div className="min-h-screen bg-white">
      <PWAUpdateBanner />

      <div className="pb-20">
        {/* Auth */}
        {tab === "login" && <Login onSent={() => { /* optional toast */ }} />}

        {/* Practice */}
        {tab === "log" && <SessionLog />}

        {/* Analytics */}
        {tab === "ytd" && <YTDSummary />}
        {tab === "heat" && <Heatmap />}
        {tab === "prog" && <Progression />}

        {/* Goals */}
        {tab === "goals" && <GoalsManager />}

        {/* Account */}
        {tab === "account" && <Account />}

        {/* Game area */}
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
