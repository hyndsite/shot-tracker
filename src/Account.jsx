import { useEffect, useState } from 'react'
import { supabase, signInWithMagicLink, signOut, getUser } from './lib/supabase'
import { pushAllLocal, pullAllRemote } from './lib/sync'

export default function Account() {
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    (async () => setUser(await getUser()))()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_evt, sess) => {
      setUser(sess?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const doSignIn = async () => {
    setStatus('Sending magic link…')
    try {
      await signInWithMagicLink(email)
      setStatus('Check your email for the login link.')
    } catch (e) {
      setStatus('Error: ' + e.message)
    }
  }

  const doSignOut = async () => {
    await signOut()
    setStatus('Signed out.')
  }

  const doPush = async () => {
    setStatus('Pushing local data…')
    const res = await pushAllLocal()
    setStatus(res.ok ? 'Push complete.' : 'Push failed: ' + (res.reason || ''))
  }

  const doPull = async () => {
    setStatus('Pulling cloud data…')
    const res = await pullAllRemote()
    setStatus(res.ok ? 'Pull complete.' : 'Pull failed: ' + (res.reason || ''))
  }

  return (
    <div style={{ padding:16, fontFamily:'system-ui, -apple-system, Segoe UI, Roboto', maxWidth:720, margin:'0 auto' }}>
      <h2>Account</h2>

      {!user && (
        <div style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:12 }}>
          <label>Email for magic link:
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} style={{ marginLeft:8, width:'60%' }} />
          </label>
          <div style={{ marginTop:8 }}>
            <button onClick={doSignIn} style={{ padding:'8px 12px', borderRadius:8 }}>Send Magic Link</button>
          </div>
          <div style={{ marginTop:8, fontSize:12, color:'#64748b' }}>{status}</div>
        </div>
      )}

      {user && (
        <div style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:12 }}>
          <div>Signed in as <b>{user.email}</b></div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button onClick={doPush} style={{ padding:'8px 12px', borderRadius:8 }}>Sync Now (Push)</button>
            <button onClick={doPull} style={{ padding:'8px 12px', borderRadius:8 }}>Sync Now (Pull)</button>
            <button onClick={doSignOut} style={{ padding:'8px 12px', borderRadius:8 }}>Sign Out</button>
          </div>
          <div style={{ marginTop:8, fontSize:12, color:'#64748b' }}>{status}</div>
        </div>
      )}
    </div>
  )
}
