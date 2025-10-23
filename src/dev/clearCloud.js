// src/dev/clearCloud.js
import { supabase, getUser } from '../lib/supabase'

/**
 * Deletes ONLY the signed-in user's rows from cloud tables.
 * Order is child→parent to satisfy FK constraints.
 */
export async function estClearCloud() {
  const me = await getUser()
  if (!me) return { ok:false, reason:'Not signed in' }

  const uid = me.id || me.user?.id // depending on your getUser() shape
  const del = async (table) => {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .eq('user_id', uid)
    if (error) throw new Error(`${table}: ${error.message}`)
    return count ?? 0
  }

  try {
    // children first
    const goalItems = await del('goal_items')
    const entries   = await del('entries')
    const markers   = await del('markers')
    // parents after
    const goalSets  = await del('goal_sets')
    const sessions  = await del('sessions')

    return { ok:true, deleted:{ goalItems, entries, markers, goalSets, sessions } }
  } catch (err) {
    return { ok:false, reason: err.message }
  }
}

// Optional helper to run from console and log nicely
export async function estClearCloudRun() {
  const res = await estClearCloud()
  console.log('estClearCloud:', res)
  alert(res.ok ? '✅ Cloud cleared for your user.' : `❌ Error: ${res.reason}`)
  return res
}

// Expose on window for quick console access
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.estClearCloud = estClearCloudRun
}
