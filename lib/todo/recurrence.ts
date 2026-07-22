import { RRule, rrulestr } from 'rrule'

// Pure, isomorphic recurrence math shared by the client complete-path and the
// MCP complete-path. No I/O — just "given an RRULE, what's the next occurrence
// strictly after `after`?".

// Friendly presets the UI offers; each maps to a plain RRULE string.
export const RECURRENCE_PRESETS: { id: string; label: string; rrule: string }[] = [
  { id: 'daily', label: 'Every day', rrule: 'FREQ=DAILY' },
  { id: 'weekdays', label: 'Weekdays', rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
  { id: 'weekly', label: 'Every week', rrule: 'FREQ=WEEKLY' },
  { id: 'biweekly', label: 'Every 2 weeks', rrule: 'FREQ=WEEKLY;INTERVAL=2' },
  { id: 'monthly', label: 'Every month', rrule: 'FREQ=MONTHLY' },
]

function normalize(rule: string): string {
  const trimmed = rule.trim()
  // Accept both bare rule text ("FREQ=DAILY") and full "RRULE:FREQ=DAILY".
  return /^rrule:/i.test(trimmed) ? trimmed : `RRULE:${trimmed}`
}

// Next occurrence strictly after `after`. Returns null if the series is
// exhausted or the rule can't be parsed.
export function nextOccurrence(rule: string, after: Date = new Date()): Date | null {
  try {
    const parsed = rrulestr(normalize(rule))
    // dtstart defaults to now if the rule carries none; anchor to `after` so the
    // series steps forward from the completion moment for open-ended habits.
    if (!(parsed instanceof RRule) || !parsed.options.dtstart) {
      const opts = RRule.parseString(normalize(rule))
      opts.dtstart = after
      const rr = new RRule(opts)
      return rr.after(after, false)
    }
    return parsed.after(after, false)
  } catch {
    return null
  }
}

// Human label for a stored rule, best-effort.
export function describeRecurrence(rule: string): string {
  const preset = RECURRENCE_PRESETS.find(p => p.rrule === rule.trim().replace(/^rrule:/i, ''))
  if (preset) return preset.label
  try {
    return rrulestr(normalize(rule)).toText()
  } catch {
    return 'Repeats'
  }
}
