export type NativeClockTheme = 'light' | 'dark'
export type NativeClockTimeFormat = '12' | '24'

export interface NativeClockSettings {
  locationName: string
  lat: number
  lon: number
  useDeviceLocation: boolean
  newsFeedUrl: string
  stockSymbols: string[]
  timeFormat: NativeClockTimeFormat
  theme: NativeClockTheme
  showSeconds: boolean
  showSmallTimer: boolean
  showStockTicker: boolean
  showNewsTicker: boolean
  /** Show today's todos inline below the clock face. */
  showTodaysTasks: boolean
  /** Max number of items in the inline today strip before it scrolls. */
  todaysTasksMax: number
  /** Seconds for one full news ticker loop (lower = faster). */
  newsTickerScrollSec: number
  /** Seconds for one full stock ticker loop (lower = faster). */
  stockTickerScrollSec: number
}

export interface NativeClockWeather {
  location: string
  temperatureF: number
  humidity: number
  condition: string
  weatherCode: number
}

export interface NativeClockHeadline {
  title: string
  link: string
  publishedAt?: string
}

export interface NativeClockNewsResponse {
  headlines: NativeClockHeadline[]
  source: string
}

export interface NativeClockStockQuote {
  symbol: string
  price: number
  changePercent: number
}

export interface NativeClockStocksResponse {
  quotes: NativeClockStockQuote[]
}
