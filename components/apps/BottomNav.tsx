'use client'

interface Tab {
  id: string
  label: string
  icon: string
}

const tabs: Tab[] = [
  { id: 'active', label: 'Active', icon: '💭' },
  { id: 'saved', label: 'Saved', icon: '⭐' },
  { id: 'graveyard', label: 'Graveyard', icon: '👻' },
]

interface BottomNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-beige border-t border-goldLight safe-area-pb z-50">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center py-3 min-h-[60px] transition-colors duration-150 ${
              activeTab === tab.id
                ? 'text-brownAccent'
                : 'text-textMuted hover:text-textPrimary'
            }`}
          >
            <span className="text-xl mb-0.5">{tab.icon}</span>
            <span className={`text-xs font-inter font-medium ${activeTab === tab.id ? 'text-brownAccent' : ''}`}>
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" style={{ width: `${100 / tabs.length}%`, marginLeft: `${(tabs.indexOf(tab) * 100) / tabs.length}%` }} />
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}
