import { describeWeather, getDefaultCoordinates } from '@/lib/native-clock/weather'
import { addDaysToDateStr, todayEastern } from '@/lib/dates'
import type { DayWeather } from '@/types/stylemate'

// Indiana seasonal normals by month (high, low °F); used when Open-Meteo is unreachable.
const SEASONAL_NORMALS: [number, number][] = [
  [36, 21], [41, 24], [52, 33], [64, 43], [74, 53], [83, 63],
  [86, 66], [85, 64], [78, 56], [66, 45], [52, 35], [40, 25],
]

function normalFor(date: string, location: string): DayWeather {
  const month = Number(date.slice(5, 7)) - 1
  const [highF, lowF] = SEASONAL_NORMALS[month]
  return { date, highF, lowF, precipChance: 30, condition: 'Seasonal average', location }
}

interface DailySeries {
  time: string[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  precipitation_probability_max: (number | null)[]
  weather_code: number[]
}

// Open-Meteo intermittently answers "service is overloaded", so callers retry once.
// Not cached: an error body must never be served for the next half hour.
async function fetchDaily(url: string): Promise<DailySeries> {
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) })
  const data = (await res.json()) as { daily?: DailySeries; reason?: string }
  if (!res.ok || !data.daily) throw new Error(`Open-Meteo: ${data.reason ?? res.status}`)
  return data.daily
}

/** Daily forecast for `days` days starting at `start` (Eastern YYYY-MM-DD). Open-Meteo covers 16 days out. */
export async function fetchForecast(start: string = todayEastern(), days = 7): Promise<DayWeather[]> {
  const { lat, lon, location } = getDefaultCoordinates()
  const end = addDaysToDateStr(start, days - 1)
  const dates = Array.from({ length: days }, (_, i) => addDaysToDateStr(start, i))

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', String(lat))
    url.searchParams.set('longitude', String(lon))
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code')
    url.searchParams.set('temperature_unit', 'fahrenheit')
    url.searchParams.set('timezone', 'America/New_York')
    url.searchParams.set('start_date', start)
    url.searchParams.set('end_date', end)

    const daily = await fetchDaily(url.toString()).catch(() => fetchDaily(url.toString()))

    return dates.map(date => {
      const i = daily.time.indexOf(date)
      if (i < 0 || daily.temperature_2m_max[i] == null) return normalFor(date, location)
      return {
        date,
        highF: Math.round(daily.temperature_2m_max[i]),
        lowF: Math.round(daily.temperature_2m_min[i]),
        precipChance: Math.round(daily.precipitation_probability_max[i] ?? 0),
        condition: describeWeather(daily.weather_code[i]),
        location,
      }
    })
  } catch {
    return dates.map(date => normalFor(date, location))
  }
}

export function describeDay(w: DayWeather): string {
  const rain = w.precipChance >= 30 ? `, ${w.precipChance}% chance of rain` : ''
  return `${w.condition}, high ${w.highF}°F / low ${w.lowF}°F${rain} (${w.location})`
}
