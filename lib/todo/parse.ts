// Lightweight natural-language parser for the quick-add bar.
// Pulls a due date/time out of free text and returns the cleaned title.
// No AI dependency — just keyword + time matching, evaluated client-side.

export interface ParsedTodo {
  title: string
  dueAt: string | null // ISO string, or null if no date found
}

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

function atTime(base: Date, hours: number, minutes: number): Date {
  const d = new Date(base)
  d.setHours(hours, minutes, 0, 0)
  return d
}

// Parse a clock time like "3pm", "9:30am", "15:00", "at 8".
// Returns { hours, minutes, matched } where matched is the source substring.
function extractTime(
  text: string
): { hours: number; minutes: number; matched: string } | null {
  const re = /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const meridiem = m[3]?.toLowerCase()
    let hours = parseInt(m[1], 10)
    const minutes = m[2] ? parseInt(m[2], 10) : 0

    // Require a meridiem, a colon, or a leading "at" to count as a time —
    // avoids swallowing bare numbers like "buy 2 eggs".
    if (!meridiem && !m[2] && !/^at\s/i.test(m[0])) continue
    if (hours > 23 || minutes > 59) continue

    if (meridiem === 'pm' && hours < 12) hours += 12
    if (meridiem === 'am' && hours === 12) hours = 0

    return { hours, minutes, matched: m[0] }
  }
  return null
}

export function parseTodoInput(input: string, now: Date = new Date()): ParsedTodo {
  let remaining = ` ${input.trim()} `
  let date: Date | null = null

  const lower = remaining.toLowerCase()

  // --- Relative day keywords ---
  const dayMatchers: { re: RegExp; resolve: () => Date }[] = [
    { re: /\btoday\b/i, resolve: () => new Date(now) },
    {
      re: /\btonight\b/i,
      resolve: () => atTime(now, 20, 0),
    },
    {
      re: /\btomorrow\b/i,
      resolve: () => {
        const d = new Date(now)
        d.setDate(d.getDate() + 1)
        return d
      },
    },
    {
      re: /\bnext week\b/i,
      resolve: () => {
        const d = new Date(now)
        d.setDate(d.getDate() + 7)
        return d
      },
    },
  ]

  for (const { re, resolve } of dayMatchers) {
    if (re.test(remaining)) {
      date = resolve()
      remaining = remaining.replace(re, ' ')
      break
    }
  }

  // --- "in N days/hours" ---
  if (!date) {
    const inMatch = lower.match(/\bin\s+(\d+)\s+(day|days|hour|hours|week|weeks)\b/i)
    if (inMatch) {
      const n = parseInt(inMatch[1], 10)
      const unit = inMatch[2].toLowerCase()
      const d = new Date(now)
      if (unit.startsWith('day')) d.setDate(d.getDate() + n)
      else if (unit.startsWith('week')) d.setDate(d.getDate() + n * 7)
      else if (unit.startsWith('hour')) d.setHours(d.getHours() + n)
      date = d
      remaining = remaining.replace(new RegExp(inMatch[0], 'i'), ' ')
    }
  }

  // --- Weekday names ("monday", "next friday") ---
  if (!date) {
    for (let i = 0; i < WEEKDAYS.length; i++) {
      const re = new RegExp(`\\b(next\\s+)?${WEEKDAYS[i]}\\b`, 'i')
      const m = remaining.match(re)
      if (m) {
        const d = new Date(now)
        const diff = (i - d.getDay() + 7) % 7
        d.setDate(d.getDate() + (diff === 0 ? 7 : diff))
        date = d
        remaining = remaining.replace(re, ' ')
        break
      }
    }
  }

  // --- Time of day ---
  const time = extractTime(remaining)
  if (time) {
    if (!date) date = new Date(now)
    date = atTime(date, time.hours, time.minutes)
    remaining = remaining.replace(time.matched, ' ')
  } else if (date) {
    // A date with no explicit time defaults to 9:00am, except "tonight".
    if (date.getHours() === 0 && date.getMinutes() === 0) {
      date = atTime(date, 9, 0)
    }
  }

  const title = remaining.replace(/\s+/g, ' ').trim()

  return {
    title: title || input.trim(),
    dueAt: date ? date.toISOString() : null,
  }
}

// Human-friendly label for a due date, e.g. "Today 3:00 PM", "Fri 9:00 AM".
export function formatDue(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  const sameDay = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()

  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  if (sameDay) return `Today ${time}`
  if (isTomorrow) return `Tomorrow ${time}`

  const within7 = (d.getTime() - now.getTime()) / 86400000 < 7 && d > now
  if (within7) {
    return `${d.toLocaleDateString([], { weekday: 'short' })} ${time}`
  }
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`
}

export function isOverdue(iso: string, now: Date = new Date()): boolean {
  return new Date(iso).getTime() < now.getTime()
}

export function isDueToday(iso: string, now: Date = new Date()): boolean {
  return new Date(iso).toDateString() === now.toDateString()
}
