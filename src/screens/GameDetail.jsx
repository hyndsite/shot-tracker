import GameLogger from './GameLogger'

export default function GameDetail({ session, onBack }) {
  return (
    <div className="p-3 space-y-2">
      <button className="text-sm text-gray-600" onClick={onBack}>← Back</button>
      <GameLogger session={session} readOnly />
    </div>
  )
}
