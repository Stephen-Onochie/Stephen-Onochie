import { redirect } from 'next/navigation'
import AppCard from '@/components/apps/AppCard'

export default async function AppsPage() {
  // Middleware handles the auth guard. We perform a secondary check here
  // only when Supabase is configured (middleware already redirected otherwise).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isConfigured =
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'your_supabase_project_url'

  if (isConfigured) {
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        redirect('/?auth=required')
      }
    } catch {
      redirect('/?auth=error')
    }
  }

  return (
    <main className="min-h-screen bg-beige px-6 py-10">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <h1 className="font-playfair text-3xl font-bold text-textPrimary mb-1">
            My Apps
          </h1>
          <p className="text-textMuted font-inter text-sm">
            Personal tools, built for you.
          </p>
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
