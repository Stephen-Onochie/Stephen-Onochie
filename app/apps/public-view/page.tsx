import { redirect } from 'next/navigation'

export default function PublicViewRedirect() {
  redirect('/apps/site-settings?tab=projects')
}
