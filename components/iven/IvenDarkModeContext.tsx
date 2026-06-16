'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type DarkModeContext = {
  dark: boolean
  toggleDark: () => void
}

const Ctx = createContext<DarkModeContext>({ dark: false, toggleDark: () => {} })

export function IvenDarkModeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('iven-dark')
    if (stored === 'true') setDark(true)
    setMounted(true)
  }, [])

  function toggleDark() {
    setDark(prev => {
      const next = !prev
      localStorage.setItem('iven-dark', String(next))
      return next
    })
  }

  // Avoid flash of wrong theme — render nothing until localStorage is read
  if (!mounted) return null

  return (
    <Ctx.Provider value={{ dark, toggleDark }}>
      {children}
    </Ctx.Provider>
  )
}

export function useIvenDarkMode() {
  return useContext(Ctx)
}
