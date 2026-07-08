import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'
import * as hevy from '@/lib/hevy/client'

export const dynamic = 'force-dynamic'

const setSchema = z.object({
  type: z.enum(['warmup', 'normal', 'failure', 'dropset']).default('normal'),
  weight_kg: z.number().nullable().optional(),
  reps: z.number().int().nullable().optional(),
  distance_meters: z.number().int().nullable().optional(),
  duration_seconds: z.number().int().nullable().optional(),
  custom_metric: z.number().nullable().optional(),
})

const exerciseSchema = z.object({
  exercise_template_id: z.string().describe('Hevy exercise template ID, e.g. from search_exercise_templates'),
  superset_id: z.number().int().nullable().optional(),
  rest_seconds: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
  sets: z.array(setSchema),
})

function json(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
}

function jsonError(error: unknown) {
  return {
    content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }],
    isError: true,
  }
}

const handler = createMcpHandler(
  server => {
    server.registerTool(
      'get_workouts',
      {
        title: 'Get Workouts',
        description: "Get a paginated list of the user's logged Hevy workouts, most recent first.",
        inputSchema: {
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(10).default(5),
        },
      },
      async ({ page, pageSize }) => {
        try {
          return json(await hevy.getWorkouts(page, pageSize))
        } catch (e) {
          return jsonError(e)
        }
      }
    )

    server.registerTool(
      'get_workout',
      {
        title: 'Get Workout',
        description: 'Get a single Hevy workout by its ID.',
        inputSchema: { workout_id: z.string() },
      },
      async ({ workout_id }) => {
        try {
          return json(await hevy.getWorkout(workout_id))
        } catch (e) {
          return jsonError(e)
        }
      }
    )

    server.registerTool(
      'get_workout_count',
      {
        title: 'Get Workout Count',
        description: 'Get the total number of workouts logged on the account.',
        inputSchema: {},
      },
      async () => {
        try {
          return json(await hevy.getWorkoutCount())
        } catch (e) {
          return jsonError(e)
        }
      }
    )

    server.registerTool(
      'get_routines',
      {
        title: 'Get Routines',
        description: 'Get a paginated list of saved Hevy routines.',
        inputSchema: {
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(10).default(5),
        },
      },
      async ({ page, pageSize }) => {
        try {
          return json(await hevy.getRoutines(page, pageSize))
        } catch (e) {
          return jsonError(e)
        }
      }
    )

    server.registerTool(
      'get_routine',
      {
        title: 'Get Routine',
        description: 'Get a single Hevy routine by its ID.',
        inputSchema: { routine_id: z.string() },
      },
      async ({ routine_id }) => {
        try {
          return json(await hevy.getRoutine(routine_id))
        } catch (e) {
          return jsonError(e)
        }
      }
    )

    server.registerTool(
      'create_routine',
      {
        title: 'Create Routine',
        description:
          'Create a new Hevy routine. Look up exercise_template_id values with search_exercise_templates first.',
        inputSchema: {
          title: z.string(),
          folder_id: z.number().int().nullable().optional().describe('Pass null for the default "My Routines" folder'),
          notes: z.string().optional(),
          exercises: z.array(exerciseSchema),
        },
      },
      async ({ title, folder_id, notes, exercises }) => {
        try {
          return json(await hevy.createRoutine({ title, folder_id: folder_id ?? null, notes, exercises }))
        } catch (e) {
          return jsonError(e)
        }
      }
    )

    server.registerTool(
      'update_routine',
      {
        title: 'Update Routine',
        description: 'Replace the title, notes, and exercises of an existing Hevy routine.',
        inputSchema: {
          routine_id: z.string(),
          title: z.string(),
          notes: z.string().optional(),
          exercises: z.array(exerciseSchema),
        },
      },
      async ({ routine_id, title, notes, exercises }) => {
        try {
          return json(await hevy.updateRoutine(routine_id, { title, notes, exercises }))
        } catch (e) {
          return jsonError(e)
        }
      }
    )

    server.registerTool(
      'get_routine_folders',
      {
        title: 'Get Routine Folders',
        description: 'Get a paginated list of routine folders on the account.',
        inputSchema: {
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(10).default(10),
        },
      },
      async ({ page, pageSize }) => {
        try {
          return json(await hevy.getRoutineFolders(page, pageSize))
        } catch (e) {
          return jsonError(e)
        }
      }
    )

    server.registerTool(
      'create_routine_folder',
      {
        title: 'Create Routine Folder',
        description: 'Create a new routine folder.',
        inputSchema: { title: z.string() },
      },
      async ({ title }) => {
        try {
          return json(await hevy.createRoutineFolder(title))
        } catch (e) {
          return jsonError(e)
        }
      }
    )

    server.registerTool(
      'search_exercise_templates',
      {
        title: 'Search Exercise Templates',
        description:
          'Search Hevy exercise templates by title substring (case-insensitive) to find exercise_template_id values for building routines.',
        inputSchema: {
          query: z.string(),
          limit: z.number().int().min(1).max(50).default(20),
        },
      },
      async ({ query, limit }) => {
        try {
          return json(await hevy.searchExerciseTemplates(query, limit))
        } catch (e) {
          return jsonError(e)
        }
      }
    )
  },
  {},
  { basePath: '/api', maxDuration: 60, disableSse: true }
)

function authorized(req: Request) {
  const secret = process.env.MCP_HEVY_SECRET
  if (!secret) return false
  const url = new URL(req.url)
  return url.searchParams.get('key') === secret
}

async function withAuth(req: Request) {
  if (!authorized(req)) {
    return new Response('Not found', { status: 404 })
  }
  return handler(req)
}

export { withAuth as GET, withAuth as POST, withAuth as DELETE }
