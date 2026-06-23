export type Shelf = 'reading' | 'want' | 'finished'

export interface ReadingSettings {
  user_id: string
  daily_goal_minutes: number
  created_at: string
  updated_at: string
}

export interface ReadingBook {
  id: string
  user_id: string
  title: string
  author: string | null
  cover_url: string | null
  total_pages: number | null
  current_page: number
  shelf: Shelf
  is_public_current: boolean
  started_at: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
}

export interface ReadingSession {
  id: string
  user_id: string
  book_id: string
  started_at: string
  ended_at: string | null
  minutes: number | null
  start_page: number | null
  end_page: number | null
  notes: string | null
  session_date: string
  created_at: string
}

// Shape returned by /api/reading/book-search (Open Library lookup).
export interface BookSearchResult {
  title: string
  author: string | null
  coverUrl: string | null
  totalPages: number | null
}

// Shape returned by /api/public/current-book.
export interface PublicCurrentBook {
  title: string
  author: string | null
  coverUrl: string | null
  currentPage: number
  totalPages: number | null
}
