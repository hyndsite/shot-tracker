import { Home, BarChart3, Target, Map, Activity, User, Trophy } from "lucide-react"

const TABS = [
  { key: "practice",     label: "Practice",      Icon: Home },
  { key: "ytd",     label: "YTD",      Icon: BarChart3 },
  { key: "goals",   label: "Goals",    Icon: Target },
  { key: "heat",    label: "Heatmap",  Icon: Map },
  { key: "prog",    label: "Progress", Icon: Activity },
  { key: "game",    label: "Game",     Icon: Trophy },
  { key: "account", label: "Account",  Icon: User },
]

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="nav-wrap">
      <div className="nav-list">
        {TABS.map(({ key, label, Icon }) => {
          const isActive = active === key
          const iconClass = isActive ? "nav-act" : "nav-inact"
          const textClass = isActive ? "nav-act" : "nav-inactT"
          return (
            <button
              key={key}
              type="button"
              className="nav-item"  // ensure transparent background
              onClick={() => onChange?.(key)}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
            >
              <Icon className={iconClass} />
              <span className={`nav-label ${textClass}`}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
