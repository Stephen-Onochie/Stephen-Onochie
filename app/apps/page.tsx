import AppCard from '@/components/apps/AppCard'
import AppHeader from '@/components/apps/AppHeader'
import SignOutButton from '@/components/auth/SignOutButton'

export default function AppsPage() {
  return (
    <main className="min-h-screen bg-beige">
      <AppHeader title="My Apps" right={<SignOutButton />} />
      <div className="max-w-lg mx-auto px-6 py-8">
        <p className="text-textMuted font-inter text-sm mb-8">
          Personal tools, built for you.
        </p>

        <div className="grid grid-cols-1 gap-4">
          <AppCard
            name="Bubbles"
            description="Capture thoughts, ideas, and impulses before they vanish."
            icon="💭"
            href="/apps/bubbles"
          />
          <AppCard
            name="Standing Timer"
            description="Cycle between standing, sitting, and breaks at your desk."
            icon="🧍"
            href="/apps/standing-timer"
          />
        </div>
      </div>
    </main>
  )
}
