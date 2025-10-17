import { useState } from 'react'
import BatchWizard from './BatchWizard'
import YTDSummary from './YTDSummary'

export default function App() {
  const [tab, setTab] = useState('log')

  return (
    <div>
      <nav style={{ position:'sticky', top:0, zIndex:10, background:'#0f172a', color:'white', padding:'10px 12px', display:'flex', gap:8 }}>
        <button
          onClick={()=>setTab('log')}
          style={{ padding:'8px 12px', borderRadius:8, background: tab==='log' ? '#22c55e' : 'white', color: tab==='log' ? 'white':'#0f172a', border:'none' }}
        >
          Log
        </button>
        <button
          onClick={()=>setTab('ytd')}
          style={{ padding:'8px 12px', borderRadius:8, background: tab==='ytd' ? '#22c55e' : 'white', color: tab==='ytd' ? 'white':'#0f172a', border:'none' }}
        >
          YTD
        </button>
      </nav>

      {tab === 'log' ? <BatchWizard /> : <YTDSummary />}
    </div>
  )
}
