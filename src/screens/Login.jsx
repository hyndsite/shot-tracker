import { useEffect, useState } from "react"
import { getUser, signInWithMagicLink } from "../lib/supabase"

export default function Login() {
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [alreadyAuthed, setAlreadyAuthed] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      const u = await getUser()
      if (u) setAlreadyAuthed(true)
    })()
  }, [])

  async function sendLink(e) {
    e.preventDefault()
    setError(null)
    setSent(false)
    setSending(true)
    try {
      await signInWithMagicLink(email.trim())
      setSent(true)
      setEmail("") // clear after success
    } catch (err) {
      setError(err?.message || "Failed to send magic link.")
    } finally {
      setSending(false)
    }
  }

  if (alreadyAuthed) {
    return (
      <div className="page">
        <h1 className="text-xl font-semibold mb-2">You’re already signed in</h1>
        <p className="muted">Use the tabs below to navigate.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="mb-4 text-center">
        <h1 className="text-xl font-semibold">Sign In</h1>
      </header>

      <main>
        <h2 className="text-3xl font-extrabold mb-2">Welcome Back</h2>
        <p className="muted mb-6">Enter your email to receive a magic link for instant access.</p>

        <form onSubmit={sendLink} className="max-w-md">
          <label className="block text-sm font-medium">Email Address</label>
          <div className="mt-1 mb-4 flex items-center gap-2 border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-600 bg-white">
            <span className="text-slate-500">✉️</span>
            <input
              type="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@example.com"
              className="flex-1 outline-none bg-transparent"
            />
          </div>

          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

          <button type="submit" disabled={sending} className="btn btn-primary">
            {sending ? "Sending…" : "Send Magic Link"}
          </button>

          {sent && (
            <p className="mt-2 text-sm text-green-600">Link sent. Please check your email.</p>
          )}
        </form>
      </main>
    </div>
  )
}
