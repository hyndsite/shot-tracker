import {
    Home,
    BarChart3,
    Target,
    Map,
    Activity,
    User,
  } from "lucide-react"
  
  const TABS = [
    { key: "log", label: "Log", Icon: Home },
    { key: "ytd", label: "YTD Summary", Icon: BarChart3 },
    { key: "goals", label: "Goals", Icon: Target },
    { key: "heat", label: "Heatmap", Icon: Map },
    { key: "prog", label: "Progress", Icon: Activity },
    { key: "account", label: "Account", Icon: User },
  ]
  
  export default function BottomNav({ active, onChange }) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white">
        <ul className="flex justify-around max-w-3xl mx-auto py-2 px-1 sm:py-2">
          {TABS.map(({ key, label, Icon }) => {
            const isActive = active === key
            return (
              <li key={key}>
                <button
                  onClick={() => onChange(key)}
                  className="flex flex-col items-center justify-center w-16 sm:w-20"
                >
                  <Icon
                    size={22}
                    strokeWidth={2}
                    className={
                      isActive ? "text-blue-600" : "text-slate-500"
                    }
                  />
                  <span
                    className={`mt-1 text-[11px] font-medium ${
                      isActive ? "text-blue-600" : "text-slate-600"
                    }`}
                  >
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
  