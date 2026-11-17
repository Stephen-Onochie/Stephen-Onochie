import { redirect } from 'next/navigation'

export default function AnalyticsRedirect() {
  redirect('/apps/site-settings?tab=analytics')
}
