import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export async function getAuthorizedAppUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const allowedEmail = process.env.ALLOWED_EMAIL
  if (allowedEmail && user.email !== allowedEmail) return null

  return user
}
