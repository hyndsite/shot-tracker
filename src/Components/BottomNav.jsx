import { Home, BarChart3, Target, Map, Activity, User, Trophy } from "lucide-react"

const TABS = [
  { key: "log", label: "Log", Icon: Home },
  { key: "ytd", label: "YTD", Icon: BarChart3 },
  { key: "goals", label: "Goals", Icon: Target },
  { key: "heat", label: "Heatmap", Icon: Map },
  { key: "prog", label: "Progress", Icon: Activity },
  { key: "account", label: "Account", Icon: User },
  { key: "game", label: "Game", Icon: Trophy },
]

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="nav-wrap">
      <ul className="nav-list">
        {TABS.map(({ key, label, Icon }) => {
          const isActive = active === key
          return (
            <li key={key}>
              <button onClick={() => onChange(key)} className="nav-item">
                <Icon
                  size={22}
                  strokeWidth={2}
                  className={`nav-icon ${isActive ? 'nav-act' : 'nav-inact'}`}
                />
                <span className={`nav-label ${isActive ? 'nav-act' : 'nav-inact'}`}>
                  {label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
