import AppCard from '@/components/apps/AppCard'
import HomeLink from '@/components/apps/HomeLink'
import SignOutButton from '@/components/auth/SignOutButton'

export default function AppsPage() {
  return (
    <main className="min-h-screen bg-beige px-6 py-10">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <HomeLink />
        </div>
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-playfair text-3xl font-bold text-textPrimary mb-1">
              My Apps
            </h1>
            <p className="text-textMuted font-inter text-sm">
              Personal tools, built for you.
            </p>
          </div>
          <SignOutButton />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <AppCard
            name="Bubbles"
            description="Capture thoughts, ideas, and impulses before they vanish."
            icon="💭"
            href="/apps/bubbles"
          />
        </div>
      </div>
    </main>
  )
}
