import { useEffect, useState } from 'react'

export default function ShotModal({ open, zone, onClose, onSubmit }) {
  const [isThree, setIsThree] = useState(zone?.isThree ?? false)
  const [context, setContext] = useState(null) // 'Catch & Shoot' | 'Off Dribble'
  const [contested, setContested] = useState(false)

  useEffect(() => {
    if (open) {
      setIsThree(zone?.isThree ?? false)
      setContext(null)
      setContested(false)
    }
  }, [open, zone])

  if (!open) return null

  const canToggleContested = !!context
  const canChooseResult = !!context

  function chooseResult(result) {
    if (!canChooseResult) return
    onSubmit({
      isThree,
      shotContext: context,
      contested,
      result, // 'make' | 'miss'
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
        <div className="text-base font-semibold">{zone?.label || 'Zone'}</div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Btn on={isThree === false} onClick={()=>setIsThree(false)}>2-ptr</Btn>
            <Btn on={isThree === true}  onClick={()=>setIsThree(true)}>3-ptr</Btn>
          </div>

          <div className="flex gap-2">
            <Btn on={context === 'Catch & Shoot'} onClick={()=>setContext('Catch & Shoot')}>Catch & Shoot</Btn>
            <Btn on={context === 'Off Dribble'}  onClick={()=>setContext('Off Dribble')}>Off Dribble</Btn>
          </div>

          <div className="flex items-center gap-2">
            <button
              className={"px-3 py-2 rounded border " + (canToggleContested ? "" : "opacity-50 pointer-events-none") + (contested ? " bg-gray-900 text-white" : "")}
              onClick={()=>setContested(v=>!v)}
            >
              Contested Shot
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              className={"px-4 py-2 rounded " + (canChooseResult ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed")}
              onClick={()=>chooseResult('make')}
            >Make</button>
            <button
              className={"px-4 py-2 rounded " + (canChooseResult ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed")}
              onClick={()=>chooseResult('miss')}
            >Miss</button>
          </div>
        </div>

        <div className="pt-1">
          <button className="text-sm text-gray-500" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function Btn({ on, onClick, children }) {
  return (
    <button
      className={"px-3 py-2 rounded border " + (on ? "bg-black text-white" : "")}
      onClick={onClick}
    >{children}</button>
  )
}
