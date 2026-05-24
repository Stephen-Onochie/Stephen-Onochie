'use client'

interface StandingTimerNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { id: 'timer', label: 'Timer', icon: '⏱️' },
  { id: 'stats', label: 'Stats', icon: '📊' },
  { id: 'history', label: 'History', icon: '📋' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function StandingTimerNav({ activeTab, onTabChange }: StandingTimerNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-beige border-t border-goldLight z-50">
      <div className="flex relative">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex-1 flex flex-col items-center justify-center py-3 min-h-[60px] transition-colors duration-150 ${
              activeTab === tab.id ? 'text-brownAccent' : 'text-textMuted hover:text-textPrimary'
            }`}
          >
            <span className="text-xl mb-0.5">{tab.icon}</span>
            <span
              className={`text-xs font-inter font-medium ${
                activeTab === tab.id ? 'text-brownAccent' : ''
              }`}
            >
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <span
                className="absolute bottom-0 h-0.5 bg-gold transition-all duration-200"
                style={{
                  width: `${100 / tabs.length}%`,
                  left: `${(index * 100) / tabs.length}%`,
                }}
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}
