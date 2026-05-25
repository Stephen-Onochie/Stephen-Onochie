import type { NativeClockWeather } from '@/types/native-clock'

const WMO_CONDITIONS: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Foggy',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Showers',
  81: 'Showers',
  82: 'Heavy showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm',
  99: 'Thunderstorm',
}

function describeWeather(code: number): string {
  return WMO_CONDITIONS[code] ?? 'Current conditions'
}

export function getDefaultCoordinates(): { lat: number; lon: number; location: string } {
  const lat = parseFloat(process.env.NATIVE_CLOCK_LAT ?? '40.4259')
  const lon = parseFloat(process.env.NATIVE_CLOCK_LON ?? '-86.9081')
  const location = process.env.NATIVE_CLOCK_LOCATION?.trim() || 'West Lafayette'
  return { lat, lon, location }
}

export async function fetchWeather(
  lat: number,
  lon: number,
  locationLabel: string
): Promise<NativeClockWeather> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,weather_code'
  )
  url.searchParams.set('temperature_unit', 'fahrenheit')
  url.searchParams.set('timezone', 'auto')

  const response = await fetch(url.toString(), {
    next: { revalidate: 900 },
  })

  if (!response.ok) {
    throw new Error('Weather service unavailable')
  }

  const data = (await response.json()) as {
    current?: {
      temperature_2m?: number
      relative_humidity_2m?: number
      weather_code?: number
    }
  }

  const current = data.current
  if (!current || current.temperature_2m == null) {
    throw new Error('Invalid weather response')
  }

  const weatherCode = current.weather_code ?? 0

  return {
    location: locationLabel,
    temperatureF: Math.round(current.temperature_2m),
    humidity: Math.round(current.relative_humidity_2m ?? 0),
    condition: describeWeather(weatherCode),
    weatherCode,
  }
}
