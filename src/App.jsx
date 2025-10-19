import { useState, useEffect } from "react"
import SessionLog from "./screens/SessionLog"
import YTDSummary from "./YTDSummary"
import GoalsManager from "./GoalsManager"
import Heatmap from "./Heatmap"
import Progression from "./Progression"
import Account from "./Account"
import PWAUpdateBanner from "./PWAUpdateBanner"

export default function App() {
  const [tab, setTab] = useState("log")

  useEffect(() => {
    const t = localStorage.getItem("est.activeTab")
    if (t) setTab(t)
  }, [])
  useEffect(() => {
    localStorage.setItem("est.activeTab", tab)
  }, [tab])

  return (
    <div className="font-sans bg-slate-50 min-h-screen pb-16"> 
      <PWAUpdateBanner />

      {/* Main content area */}
      <main className="mx-auto max-w-3xl px-3 sm:px-4 pt-3 pb-20">
        {tab === "log" && <SessionLog />}
        {tab === "ytd" && <YTDSummary />}
        {tab === "goals" && <GoalsManager />}
        {tab === "heat" && <Heatmap />}
        {tab === "prog" && <Progression />}
        {tab === "account" && <Account />}
      </main>

      {/* Fixed bottom nav */}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
