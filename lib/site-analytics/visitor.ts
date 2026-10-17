// Client-side helpers that keep the owner's own browsing out of site analytics.
// IvenShell marks the browser as the owner's on every private-app visit; page
// views and click tracking skip any browser carrying the flag.
const OWNER_FLAG_KEY = 'iven-owner'

const PRIVATE_PATH_PREFIXES = ['/apps', '/login', '/auth']

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATH_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function markOwnerBrowser() {
  try {
    localStorage.setItem(OWNER_FLAG_KEY, '1')
  } catch {
    // Storage blocked (private mode); the owner's visits just get counted.
  }
}

export function isOwnerBrowser(): boolean {
  try {
    return localStorage.getItem(OWNER_FLAG_KEY) === '1'
  } catch {
    return false
  }
}
