'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface RemoteButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'default' | 'accent' | 'danger'
}

const VARIANTS: Record<NonNullable<RemoteButtonProps['variant']>, string> = {
  default: 'bg-surface border-goldLight text-textPrimary hover:border-gold',
  accent: 'bg-gold border-gold text-beige hover:bg-goldLight',
  danger: 'bg-surface border-goldLight text-red-700 hover:border-red-400',
}

export default function RemoteButton({
  children,
  variant = 'default',
  className = '',
  ...props
}: RemoteButtonProps) {
  return (
    <button
      type="button"
      className={`flex items-center justify-center gap-2 rounded-xl border font-inter text-sm font-medium px-4 py-3 transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
