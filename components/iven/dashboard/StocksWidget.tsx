'use client'

import { useEffect, useState } from 'react'

interface StockItem {
  symbol: string
  price: number | string
  change: number | string
  changePercent: number | string
}

export default function StocksWidget() {
  const [stocks, setStocks] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/native-clock/stocks')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data)) setStocks(data)
        else if (data?.quotes) setStocks(data.quotes)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div
      className="rounded-[18px] p-6"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}
    >
      <div className="flex justify-between items-end mb-4">
        <div>
          <div className="font-mono text-[10px] font-semibold tracking-[2.5px] uppercase mb-1" style={{ color: 'var(--iven-accent)' }}>MARKETS</div>
          <div className="font-playfair font-bold text-xl" style={{ color: 'var(--iven-text)' }}>Watchlist</div>
        </div>
        <span className="font-mono text-[9.5px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>DELAYED · 15M</span>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--iven-grid)', opacity: 0.3 }} />
          ))}
        </div>
      ) : stocks.length === 0 ? (
        <div className="font-mono text-[11px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>UNAVAILABLE</div>
      ) : (
        <div className="grid grid-cols-2 gap-x-6">
          {stocks.map(s => {
            const chg = Number(s.changePercent)
            const up = chg >= 0
            const chgColor = up ? 'var(--iven-accent)' : '#6B4F2A'
            const chgStr = `${up ? '+' : ''}${isNaN(chg) ? s.changePercent : chg.toFixed(2)}%`
            return (
              <div
                key={s.symbol}
                className="flex items-center gap-3 py-2"
                style={{ borderTop: '1px solid var(--iven-grid)' }}
              >
                <span className="font-mono text-[13px] font-bold tracking-[0.5px]" style={{ color: 'var(--iven-text)', width: 50 }}>
                  {s.symbol}
                </span>
                <span className="font-mono text-[13px] ml-auto" style={{ color: 'var(--iven-muted)' }}>
                  {typeof s.price === 'number' ? s.price.toFixed(2) : s.price}
                </span>
                <span className="font-mono text-[12px] font-semibold" style={{ color: chgColor, width: 56, textAlign: 'right' }}>
                  {chgStr}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
