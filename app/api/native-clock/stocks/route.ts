import { NextResponse } from 'next/server'
import { getAuthorizedAppUser } from '@/lib/native-clock/auth'
import { fetchStockQuotes, normalizeStockSymbols } from '@/lib/native-clock/stocks'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const user = await getAuthorizedAppUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const symbolsParam = new URL(request.url).searchParams.get('symbols') ?? ''
  const symbols = normalizeStockSymbols(symbolsParam.split(/[\s,;]+/))

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: [] })
  }

  try {
    const quotes = await fetchStockQuotes(symbols)
    return NextResponse.json({ quotes })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load stocks'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
