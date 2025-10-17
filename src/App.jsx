import { useState } from 'react'
import BatchWizard from './BatchWizard'
import YTDSummary from './YTDSummary'
import Goals from './Goals'

export default function App() {
  const [tab, setTab] = useState('log')

  const tabBtn = (key, label) => (
    <button
      key={key}
      onClick={()=>setTab(key)}
      style={{
        padding:'8px 12px', borderRadius:8, marginRight:8,
        background: tab===key ? '#22c55e' : 'white',
        color: tab===key ? 'white':'#0f172a', border:'none'
      }}
    >
      {label}
    </button>
  )

  return (
    <div>
      <nav style={{ position:'sticky', top:0, zIndex:10, background:'#0f172a', color:'white', padding:'10px 12px', display:'flex' }}>
        {tabBtn('log', 'Log')}
        {tabBtn('ytd', 'YTD')}
        {tabBtn('goals', 'Goals')}
      </nav>

      {tab === 'log' && <BatchWizard />}
      {tab === 'ytd' && <YTDSummary />}
      {tab === 'goals' && <Goals />}
    </div>
  )
}
