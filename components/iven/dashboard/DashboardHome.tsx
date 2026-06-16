'use client'

import ClockHeroWidget from './ClockHeroWidget'
import TodoWidget from './TodoWidget'
import StandingTimerWidget from './StandingTimerWidget'
import WeatherWidget from './WeatherWidget'
import StocksWidget from './StocksWidget'
import WavesStreakWidget from './WavesStreakWidget'

export default function DashboardHome() {
  return (
    <div className="p-7 flex flex-col gap-4 min-h-full">
      <ClockHeroWidget />

      <div className="flex gap-4 flex-1" style={{ minHeight: 0 }}>
        {/* Left column */}
        <div className="flex flex-col gap-4" style={{ flex: '1.55', minWidth: 0 }}>
          <TodoWidget />
          <StocksWidget />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4" style={{ flex: 1, minWidth: 260 }}>
          <StandingTimerWidget />
          <WeatherWidget />
          <WavesStreakWidget />
        </div>
      </div>
    </div>
  )
}
