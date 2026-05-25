import { NextResponse } from 'next/server'
import { getAuthorizedAppUser } from '@/lib/native-clock/auth'
import { fetchWeather, getDefaultCoordinates } from '@/lib/native-clock/weather'

export async function GET(request: Request) {
  const user = await getAuthorizedAppUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const defaults = getDefaultCoordinates()

  const latParam = searchParams.get('lat')
  const lonParam = searchParams.get('lon')
  const lat = latParam ? parseFloat(latParam) : defaults.lat
  const lon = lonParam ? parseFloat(lonParam) : defaults.lon
  const location =
    searchParams.get('location')?.trim() || defaults.location

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  try {
    const weather = await fetchWeather(lat, lon, location)
    return NextResponse.json(weather)
  } catch {
    return NextResponse.json(
      { error: 'Failed to load weather' },
      { status: 502 }
    )
  }
}
