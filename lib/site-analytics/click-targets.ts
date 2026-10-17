// Every tracked click on the public site. Elements opt in with
// data-track="<id>"; the track-click API rejects ids not listed here, so the
// table can't fill with junk. Repo cards use the dynamic `repo:<name>` form.
export const CLICK_TARGETS: Record<string, string> = {
  'header-github': 'Header · GitHub',
  'header-linkedin': 'Header · LinkedIn',
  'header-instagram': 'Header · Instagram',
  'apps-logo': 'Header · SO logo (sign in)',
  'agency-portal': 'Agency portal (sitesbystephen.com)',
  'connect-linkedin-handle': 'Connect · LinkedIn handle',
  'connect-linkedin-card': 'Connect · LinkedIn card',
  'github-profile': 'GitHub section · profile',
  resume: 'Resume',
  'footer-email': 'Footer · email',
  'footer-github': 'Footer · GitHub',
}

const REPO_TARGET = /^repo:[A-Za-z0-9._-]{1,100}$/

export function repoClickTarget(repoName: string): string {
  return `repo:${repoName}`
}

export function isValidClickTarget(target: string): boolean {
  return target in CLICK_TARGETS || REPO_TARGET.test(target)
}

export function clickTargetLabel(target: string): string {
  if (target.startsWith('repo:')) return `Repo · ${target.slice('repo:'.length)}`
  return CLICK_TARGETS[target] ?? target
}
