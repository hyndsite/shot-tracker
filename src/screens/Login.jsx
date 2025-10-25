import { useEffect, useState } from "react"
import { getUser, signInWithMagicLink } from "../lib/supabase"

export default function Login({ onSent }) {
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
      setSent(true)                  // <-- show confirmation
      onSent?.(email.trim())
    } catch (err) {
      setError(err?.message || "Failed to send magic link.")
    } finally {
      setSending(false)
    }
  }

  if (alreadyAuthed) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-2">You’re already signed in</h1>
        <p className="text-sm text-gray-600">Use the tabs below to navigate.</p>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex flex-col">
      <header className="py-4 text-center text-lg font-medium">Sign In</header>

      <main className="flex-1 p-6">
        <h2 className="text-3xl font-extrabold mb-2">Welcome Back</h2>
        <p className="text-gray-600 mb-6">
          Enter your email to receive a magic link for instant access.
        </p>

        <form onSubmit={sendLink} className="max-w-md">
          <label className="block text-sm font-medium">Email Address</label>
          <div className="mt-1 mb-4">
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-600">
              <span className="text-gray-500">✉️</span>
              <input
                type="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@example.com"
                className="flex-1 outline-none"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-lg bg-[#17449e] text-white text-lg py-3 disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send Magic Link"}
          </button>

          {/* Confirmation line (small, below the button) */}
          {sent && (
            <p className="mt-2 text-sm text-green-600">
              Link sent. Please check your email.
            </p>
          )}
        </form>
      </main>
    </div>
  )
}
