import { useEffect, useState } from "react"
import { getUser, signOut } from "./lib/supabase"

export default function Account() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    (async () => setUser(await getUser()))()
  }, [])

  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-2">Account</h1>
        <p className="text-sm text-gray-600">
          You’re not signed in. Use the Login page to sign in.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Account</h1>
      <div className="rounded border p-4">
        <div className="text-sm text-gray-700">
          <div><span className="font-medium">User:</span> {user.email}</div>
          <div className="text-gray-500 text-xs mt-1">User ID: {user.id}</div>
        </div>
      </div>

      {/* keep the rest of your existing Account options/buttons here */}
      <button
        className="rounded border px-4 py-2"
        onClick={async () => { await signOut(); location.reload() }}
      >
        Sign Out
      </button>
    </div>
  )
}
