import type { Metadata } from 'next'
import LgRemoteView from '@/components/lg-remote/LgRemoteView'

export const metadata: Metadata = {
  title: 'LG Remote',
  description: 'Control an LG WebOS TV from the browser via a local proxy.',
}

export default function LgRemotePage() {
  return <LgRemoteView />
}
