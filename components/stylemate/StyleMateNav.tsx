'use client'

import type { StyleMateTab } from '@/types/stylemate'

const tabs: { id: StyleMateTab; label: string; icon: string }[] = [
  { id: 'closet', label: 'Closet', icon: '👔' },
  { id: 'add', label: 'Add', icon: '📷' },
  { id: 'incoming', label: 'Incoming', icon: '📦' },
]

interface StyleMateNavProps {
  activeTab: StyleMateTab
  onTabChange: (tab: StyleMateTab) => void
}

export default function StyleMateNav({ activeTab, onTabChange }: StyleMateNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-beige border-t border-goldLight z-50">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex-1 flex flex-col items-center justify-center py-3 min-h-[60px] transition-colors duration-150 ${
              activeTab === tab.id ? 'text-brownAccent' : 'text-textMuted hover:text-textPrimary'
            }`}
          >
            <span className="text-xl mb-0.5">{tab.icon}</span>
            <span
              className={`text-xs font-inter font-medium ${activeTab === tab.id ? 'text-brownAccent' : ''}`}
            >
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <span
                className="absolute bottom-0 h-0.5 bg-gold"
                style={{
                  width: `${100 / tabs.length}%`,
                  left: `${(tabs.indexOf(tab) * 100) / tabs.length}%`,
                }}
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}
