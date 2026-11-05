// Every tracked click on the public site. Elements opt in with
// data-track="<id>"; the track-click API rejects ids not listed here, so the
// table can't fill with junk. Repo links use the dynamic `repo:<name>` form and
// project cards `project:<slug>`. Retired ids stay listed so old clicks keep
// their labels in Site Analytics.
export const CLICK_TARGETS: Record<string, string> = {
  'header-home': 'Header · Logo / name',
  'nav-resume': 'Header · Résumé',
  'hero-resume': 'Hero · View résumé',
  'hero-email': 'Hero · Email',
  'contact-email': 'Contact · Email',
  'contact-resume': 'Contact · Résumé',
  'contact-linkedin': 'Contact · LinkedIn',
  'contact-github': 'Contact · GitHub',
  'footer-signin': 'Footer · Sign in',
  'project-page-link': 'Project page · External link',
  'header-github': 'Header · GitHub',
  'header-linkedin': 'Header · LinkedIn',
  'header-instagram': 'Header · Instagram',
  'apps-logo': 'Header · SO logo (sign in, retired)',
  'agency-portal': 'Agency portal (sitesbystephen.com)',
  'connect-linkedin-handle': 'Connect · LinkedIn handle',
  'connect-linkedin-card': 'Connect · LinkedIn card',
  'github-profile': 'Work · All repos on GitHub',
  resume: 'Resume',
  'footer-email': 'Footer · email',
  'footer-github': 'Footer · GitHub',
}

const REPO_TARGET = /^repo:[A-Za-z0-9._-]{1,100}$/
const PROJECT_TARGET = /^project:[a-z0-9-]{1,80}$/

export function repoClickTarget(repoName: string): string {
  return `repo:${repoName}`
}

export function projectClickTarget(slug: string): string {
  return `project:${slug}`
}

export function isValidClickTarget(target: string): boolean {
  return target in CLICK_TARGETS || REPO_TARGET.test(target) || PROJECT_TARGET.test(target)
}

export function clickTargetLabel(target: string): string {
  if (target.startsWith('repo:')) return `Repo · ${target.slice('repo:'.length)}`
  if (target.startsWith('project:')) return `Project · ${target.slice('project:'.length)}`
  return CLICK_TARGETS[target] ?? target
}
