const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

export function formatDayLabel(day: string): string {
  const [, month, date] = day.split('-').map(Number)
  return `${MONTHS[month - 1]} ${date}`
}

export function formatHourLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric' }).format(new Date(iso))
}

export function formatPath(path: string): string {
  return path === '/' ? 'Home  /' : decodeURIComponent(path)
}

export function formatReferrer(host: string): string {
  return host ? host.replace(/^www\./, '') : 'Direct / unknown'
}

export function formatCountry(code: string): string {
  if (!code) return 'Unknown'
  try {
    return regionNames.of(code) ?? code
  } catch {
    return code
  }
}

export function formatDevice(device: string): string {
  return device ? device[0].toUpperCase() + device.slice(1) : 'Unknown'
}
