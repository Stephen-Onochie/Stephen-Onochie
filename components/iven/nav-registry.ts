import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Clock,
  CheckSquare,
  Timer,
  Waves,
  Shirt,
  MessageCircle,
  Hourglass,
  Tv2,
  Sofa,
  Activity,
  BookOpen,
  Clapperboard,
  Briefcase,
  Globe,
  ShieldCheck,
  BarChart3,
} from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  href: string
}

// Home is pinned above the reorderable list and never moves.
export const HOME_NAV_ITEM: NavItem = { id: 'home', label: 'HOME', icon: LayoutDashboard, href: '/apps' }

// Every mini app gets an entry here. The array order is the default sidebar
// order; a user's saved order (iven_preferences.sidebar_order) overrides it,
// and apps added here later are appended to the end of that saved order.
export const NAV_APPS: NavItem[] = [
  { id: 'native-clock', label: 'NATIVE CLOCK', icon: Clock, href: '/apps/native-clock' },
  { id: 'todo', label: 'TODO', icon: CheckSquare, href: '/apps/todo' },
  { id: 'standing-timer', label: 'STANDING TIMER', icon: Timer, href: '/apps/standing-timer' },
  { id: 'waves', label: 'PROJECT WAVES', icon: Waves, href: '/apps/waves' },
  { id: 'stylemate', label: 'STYLEMATE', icon: Shirt, href: '/apps/stylemate' },
  { id: 'bubbles', label: 'BUBBLES', icon: MessageCircle, href: '/apps/bubbles' },
  { id: 'fast', label: 'FASTTRACK', icon: Hourglass, href: '/apps/fast' },
  { id: 'reading', label: 'READING', icon: BookOpen, href: '/apps/reading' },
  { id: 'watchlist', label: 'WATCHLIST', icon: Clapperboard, href: '/apps/watchlist' },
  { id: 'internship', label: 'INTERNSHIP', icon: Briefcase, href: '/apps/internship' },
  { id: 'health', label: 'HEALTH', icon: Activity, href: '/apps/health' },
  { id: 'lg-remote', label: 'LG REMOTE', icon: Tv2, href: '/apps/lg-remote' },
  { id: 'dorm', label: 'DORM OS', icon: Sofa, href: '/apps/dorm' },
  { id: 'public-view', label: 'PUBLIC VIEW', icon: Globe, href: '/apps/public-view' },
  { id: 'analytics', label: 'SITE ANALYTICS', icon: BarChart3, href: '/apps/analytics' },
  { id: 'ojis', label: 'OJIS @ 50', icon: ShieldCheck, href: '/apps/ojis' },
]

export const DEFAULT_NAV_ORDER = NAV_APPS.map(item => item.id)

// Reconcile a saved order against the registry: drop ids that no longer exist,
// then append any registry apps missing from the saved order.
export function reconcileNavOrder(savedOrder: string[] | null | undefined): string[] {
  if (!savedOrder || savedOrder.length === 0) return DEFAULT_NAV_ORDER
  const known = new Set(DEFAULT_NAV_ORDER)
  const kept = savedOrder.filter((id, index) => known.has(id) && savedOrder.indexOf(id) === index)
  const keptSet = new Set(kept)
  return [...kept, ...DEFAULT_NAV_ORDER.filter(id => !keptSet.has(id))]
}
