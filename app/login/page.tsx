import { Suspense } from 'react'
import Link from 'next/link'
import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-beige flex flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-md text-center">
        <Link
          href="/"
          className="inline-block font-playfair text-2xl font-bold text-textPrimary mb-2 hover:text-brownAccent transition-colors"
        >
          Stephen Onochie
        </Link>
        <div className="flex justify-center mb-8">
          <div className="h-1 w-16 bg-gold rounded-full" />
        </div>

        <h1 className="font-playfair text-3xl md:text-4xl font-bold text-textPrimary mb-2">
          Sign in
        </h1>
        <p className="text-textMuted font-inter mb-10">
          Sign in with Google to access your private apps.
        </p>

        <Suspense
          fallback={
            <div className="w-full max-w-sm mx-auto h-12 bg-surface rounded-lg animate-pulse" />
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
