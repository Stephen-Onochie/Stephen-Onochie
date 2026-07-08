const BASE_URL = 'https://api.hevyapp.com'

function apiKey() {
  const key = process.env.HEVY_API_KEY
  if (!key) throw new Error('HEVY_API_KEY not configured')
  return key
}

async function hevyFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'api-key': apiKey(),
      accept: 'application/json',
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Hevy API ${res.status}: ${text}`)
  }
  return res.json()
}

export function getWorkouts(page = 1, pageSize = 5) {
  return hevyFetch(`/v1/workouts?page=${page}&pageSize=${pageSize}`)
}

export function getWorkout(workoutId: string) {
  return hevyFetch(`/v1/workouts/${workoutId}`)
}

export function getWorkoutCount() {
  return hevyFetch('/v1/workouts/count')
}

export function getRoutines(page = 1, pageSize = 5) {
  return hevyFetch(`/v1/routines?page=${page}&pageSize=${pageSize}`)
}

export function getRoutine(routineId: string) {
  return hevyFetch(`/v1/routines/${routineId}`)
}

export function createRoutine(routine: unknown) {
  return hevyFetch('/v1/routines', { method: 'POST', body: JSON.stringify({ routine }) })
}

export function updateRoutine(routineId: string, routine: unknown) {
  return hevyFetch(`/v1/routines/${routineId}`, { method: 'PUT', body: JSON.stringify({ routine }) })
}

export function getRoutineFolders(page = 1, pageSize = 5) {
  return hevyFetch(`/v1/routine_folders?page=${page}&pageSize=${pageSize}`)
}

export function createRoutineFolder(title: string) {
  return hevyFetch('/v1/routine_folders', {
    method: 'POST',
    body: JSON.stringify({ routine_folder: { title } }),
  })
}

type ExerciseTemplate = {
  id: string
  title: string
  type: string
  primary_muscle_group: string
  secondary_muscle_groups: string[]
  equipment: string
  is_custom: boolean
}

// Hevy has ~460 exercise templates spread across ~46 pages of 10; cache the
// full list per warm lambda instance instead of paginating on every search.
let templateCache: { data: ExerciseTemplate[]; fetchedAt: number } | null = null
const TEMPLATE_CACHE_TTL_MS = 60 * 60 * 1000

async function getAllExerciseTemplates(): Promise<ExerciseTemplate[]> {
  if (templateCache && Date.now() - templateCache.fetchedAt < TEMPLATE_CACHE_TTL_MS) {
    return templateCache.data
  }
  const first = await hevyFetch('/v1/exercise_templates?page=1&pageSize=10')
  const all: ExerciseTemplate[] = [...first.exercise_templates]
  const remainingPages = Array.from({ length: first.page_count - 1 }, (_, i) => i + 2)
  for (const page of remainingPages) {
    const result = await hevyFetch(`/v1/exercise_templates?page=${page}&pageSize=10`)
    all.push(...result.exercise_templates)
  }
  templateCache = { data: all, fetchedAt: Date.now() }
  return all
}

export async function searchExerciseTemplates(query: string, limit = 20) {
  const all = await getAllExerciseTemplates()
  const q = query.toLowerCase()
  return all.filter(t => t.title.toLowerCase().includes(q)).slice(0, limit)
}
