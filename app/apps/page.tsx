import AppHeader from '@/components/apps/AppHeader'
import AppPlayground from '@/components/apps/AppPlayground'
import SignOutButton from '@/components/auth/SignOutButton'

export default function AppsPage() {
  return (
    <main className="min-h-screen bg-beige">
      <AppHeader title="My Apps" right={<SignOutButton />} />
      <AppPlayground />
    </main>
  )
}
