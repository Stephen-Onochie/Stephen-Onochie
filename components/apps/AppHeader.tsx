import AppNavLinks from '@/components/apps/AppNavLinks'

interface AppHeaderProps {
  title: string
  right?: React.ReactNode
}

export default function AppHeader({ title, right }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-beige border-b border-goldLight px-6 py-4">
      <div className="mb-3">
        <AppNavLinks />
      </div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-playfair text-2xl font-bold text-textPrimary">{title}</h1>
        {right}
      </div>
    </header>
  )
}
