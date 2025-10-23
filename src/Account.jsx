// src/Account.jsx
import { useEffect, useState, useMemo } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'   // ← add
dayjs.extend(relativeTime)     
import { Mail, LogIn, LogOut, UploadCloud, DownloadCloud, Trash2, User as UserIcon, CheckCircle2 } from 'lucide-react'
import { supabase, getUser } from './lib/supabase'
import { pushAllLocal, pullAllRemote } from './lib/sync'
import { getSessions, getEntries, getMarkers, getGoalItems, getGoalSets, clearAll } from './lib/db'

export default function Account() {
  const [email, setEmail] = useState('')
  const [me, setMe]       = useState(null)
  const [status, setStatus] = useState('')
  const [pushing, setPushing] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [lastPush, setLastPush] = useState(null)
  const [lastPull, setLastPull] = useState(null)
  const [counts, setCounts] = useState({ sessions:0, entries:0, markers:0, goalSets:0, goalItems:0 })

  // load user + local counts
  useEffect(() => {
    (async () => {
      const u = await getUser()
      setMe(u)
      setEmail(u?.email ?? '')
      await refreshCounts()
    })()
  }, [])

  async function refreshCounts() {
    const [s,e,m,gs,gi] = await Promise.all([
      getSessions(), getEntries(), getMarkers(), getGoalSets(), getGoalItems()
    ])
    setCounts({
      sessions: s.length,
      entries:  e.length,
      markers:  m.length,
      goalSets: gs.length,
      goalItems:gi.length
    })
  }

  // ---------- AUTH ----------
  async function sendMagicLink(ev) {
    ev?.preventDefault?.()
    try {
      setStatus('Sending magic link…')
      const { error } = await supabase.auth.signInWithOtp({ email, options:{ emailRedirectTo: window.location.origin }})
      if (error) throw error
      setStatus('Magic link sent. Check your inbox.')
    } catch (err) {
      setStatus(`Error: ${err.message || err}`)
    }
  }

  async function signOut() {
    try {
      setStatus('Signing out…')
      await supabase.auth.signOut()
      setMe(null)
      setStatus('Signed out.')
    } catch (err) {
      setStatus(`Error: ${err.message || err}`)
    }
  }

  // ---------- SYNC ----------
  async function doPush() {
    if (!me) { setStatus('Please sign in first.'); return }
    setPushing(true); setStatus('Pushing local data to cloud…')
    const res = await pushAllLocal()
    setPushing(false); setStatus(res.ok ? 'Push complete.' : `Push error: ${res.reason || 'unknown'}`)
    if (res.ok) { setLastPush(Date.now()); await refreshCounts() }
  }

  async function doPull() {
    if (!me) { setStatus('Please sign in first.'); return }
    setPulling(true); setStatus('Pulling cloud data to device…')
    const res = await pullAllRemote()
    setPulling(false); setStatus(res.ok ? 'Pull complete.' : `Pull error: ${res.reason || 'unknown'}`)
    if (res.ok) { setLastPull(Date.now()); await refreshCounts() }
  }

  // ---------- DATA MGMT ----------
  async function exportLocal() {
    const [s,e,m,gs,gi] = await Promise.all([getSessions(), getEntries(), getMarkers(), getGoalSets(), getGoalItems()])
    const blob = new Blob([JSON.stringify({ sessions:s, entries:e, markers:m, goalSets:gs, goalItems:gi }, null, 2)], { type:'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `est-backup-${dayjs().format('YYYYMMDD-HHmmss')}.json`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
    setStatus('Exported local data.')
  }

  async function clearLocalData() {
    if (!confirm('This will remove all local data on this device. Cloud data remains. Continue?')) return
    await clearAll()
    await refreshCounts()
    setStatus('Local data cleared.')
  }

  const signedIn = !!me
  const lastLine = useMemo(() => {
    const parts = []
    if (lastPush) parts.push(`Last Push ${dayjs(lastPush).fromNow()}`)
    if (lastPull) parts.push(`Last Pull ${dayjs(lastPull).fromNow()}`)
    return parts.join(' · ')
  }, [lastPush, lastPull])

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 pb-24 text-slate-900">
      {/* Page header */}
      <header className="mb-4">
        <h2 className="text-xl font-bold">Account</h2>
        <p className="muted">Sign in, sync your data, and manage storage.</p>
      </header>

      {/* Profile strip */}
      <section className="card flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
          <UserIcon size={20} className="text-slate-600" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">
            {signedIn ? (me.email || 'Signed in') : 'Not signed in'}
          </div>
          <div className="text-xs text-slate-500">
            {signedIn ? 'Authenticated via magic link' : 'Use your email to receive a magic link'}
          </div>
        </div>
        {signedIn ? (
          <button onClick={signOut} className="btn btn-secondary flex items-center gap-2">
            <LogOut size={16}/> Sign out
          </button>
        ) : null}
      </section>

      {/* Auth card */}
      <section className="card mt-4">
        <h3 className="section-h mb-2">Authentication</h3>
        <form className="flex flex-col sm:flex-row gap-2 items-start sm:items-end" onSubmit={sendMagicLink}>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
            <input
              type="email"
              inputMode="email"
              className="ctl w-full"
              placeholder="you@domain.com"
              value={email}
              onChange={e=>setEmail(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-accent flex items-center gap-2">
            <Mail size={16}/> Send Magic Link
          </button>
        </form>
        {signedIn ? (
          <p className="mt-2 text-xs text-emerald-700 flex items-center gap-1">
            <CheckCircle2 size={14}/> Signed in as <b>{me.email}</b>
          </p>
        ) : null}
      </section>

      {/* Sync card */}
      <section className="card mt-4">
        <h3 className="section-h mb-2">Cloud Sync</h3>

        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <Stat label="Sessions" value={counts.sessions}/>
          <Stat label="Entries"  value={counts.entries}/>
          <Stat label="Markers"  value={counts.markers}/>
          <Stat label="Goal Sets" value={counts.goalSets}/>
          <Stat label="Goal Items" value={counts.goalItems}/>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={doPush} disabled={pushing} className="btn btn-primary flex items-center gap-2">
            <UploadCloud size={16}/> {pushing ? 'Pushing…' : 'Push to Cloud'}
          </button>
          <button onClick={doPull} disabled={pulling} className="btn btn-secondary flex items-center gap-2">
            <DownloadCloud size={16}/> {pulling ? 'Pulling…' : 'Pull from Cloud'}
          </button>
          <span className="text-xs text-slate-500 self-center">{lastLine}</span>
        </div>
      </section>

      {/* Danger zone */}
      <section className="card mt-4">
        <h3 className="section-h mb-2">Danger Zone</h3>
        <p className="text-xs text-slate-600 mb-2">
          This removes <b>local</b> data from this device. Your cloud data stays safe.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportLocal} className="btn btn-secondary flex items-center gap-2">
            Export Local JSON
          </button>
          <button onClick={clearLocalData} className="btn flex items-center gap-2" style={{background:'#fee2e2', color:'#7f1d1d'}}>
            <Trash2 size={16}/> Clear Local Data
          </button>
        </div>
      </section>

      {/* Status line */}
      {status ? <p className="mt-3 text-xs text-slate-600">{status}</p> : null}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-base font-semibold text-slate-900">{value}</div>
    </div>
  )
}
