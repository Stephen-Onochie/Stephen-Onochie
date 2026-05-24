import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AppsLogoLink() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const href = user ? '/apps' : '/login'
  const label = user ? 'My apps' : 'Sign in to apps'

  return (
    <Link
      href={href}
      className="group relative flex items-center justify-center w-11 h-11 md:w-12 md:h-12 border border-transparent hover:border-grid transition-colors duration-200"
      aria-label={label}
      title={label}
    >
      <Image
        src="/logo-so.png"
        alt="SO monogram"
        width={40}
        height={40}
        className="w-8 h-8 md:w-9 md:h-9 object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-200"
        priority
      />
      <span
        className="absolute -bottom-0.5 -right-0.5 w-1 h-1 bg-gold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        aria-hidden="true"
      />
    </Link>
  )
}
