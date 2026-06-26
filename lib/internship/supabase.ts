import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Application,
  ApplicationInsert,
  Contact,
  ContactInsert,
  ActivityEvent,
  Interview,
  InterviewType,
  InternshipDocument,
  Task,
  WeeklyGoal,
  InternshipSettings,
  Stage,
  PipelineState,
} from '@/types/internship'

async function requireUserId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')
  return session.user.id
}

// ── Applications ────────────────────────────────────────────────────────────
export async function fetchApplications(supabase: SupabaseClient): Promise<Application[]> {
  const { data, error } = await supabase
    .from('internship_applications')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Application[]) ?? []
}

export async function createApplication(
  supabase: SupabaseClient,
  app: ApplicationInsert
): Promise<Application> {
  const userId = await requireUserId(supabase)
  const { data, error } = await supabase
    .from('internship_applications')
    .insert({ ...app, user_id: userId })
    .select('*')
    .single()
  if (error) throw error
  const created = data as Application
  await logEvent(supabase, {
    application_id: created.id,
    event_type: 'created',
    description: `Added ${created.company} — ${created.role_title}`,
  })
  return created
}

export async function updateApplication(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Application>
): Promise<void> {
  const { error } = await supabase
    .from('internship_applications')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function moveApplicationStage(
  supabase: SupabaseClient,
  app: Application,
  toStage: Stage
): Promise<void> {
  if (app.stage === toStage) return
  const patch: Partial<Application> = { stage: toStage }
  // Stamp applied_at the first time a card reaches "applied".
  if (toStage === 'applied' && !app.applied_at) {
    patch.applied_at = new Date().toISOString()
  }
  await updateApplication(supabase, app.id, patch)
  await logEvent(supabase, {
    application_id: app.id,
    event_type: 'stage_change',
    description: `Moved from ${app.stage} to ${toStage}`,
  })
}

export async function deleteApplication(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from('internship_applications').delete().eq('id', id)
  if (error) throw error
}

// ── Contacts ────────────────────────────────────────────────────────────────
export async function fetchContacts(supabase: SupabaseClient): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('internship_contacts')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Contact[]) ?? []
}

export async function createContact(
  supabase: SupabaseClient,
  contact: ContactInsert
): Promise<Contact> {
  const userId = await requireUserId(supabase)
  const { data, error } = await supabase
    .from('internship_contacts')
    .insert({ ...contact, user_id: userId })
    .select('*')
    .single()
  if (error) throw error
  const created = data as Contact
  await logEvent(supabase, {
    contact_id: created.id,
    event_type: 'created',
    description: `Added contact ${created.name}`,
  })
  return created
}

export async function updateContact(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Contact>
): Promise<void> {
  const { error } = await supabase
    .from('internship_contacts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function moveContactState(
  supabase: SupabaseClient,
  contact: Contact,
  toState: PipelineState
): Promise<void> {
  if (contact.pipeline_state === toState) return
  await updateContact(supabase, contact.id, { pipeline_state: toState })
  await logEvent(supabase, {
    contact_id: contact.id,
    event_type: 'pipeline_change',
    description: `Moved from ${contact.pipeline_state} to ${toState}`,
  })
}

export async function deleteContact(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('internship_contacts').delete().eq('id', id)
  if (error) throw error
}

// ── Interviews ──────────────────────────────────────────────────────────────
export async function fetchInterviews(supabase: SupabaseClient): Promise<Interview[]> {
  const { data, error } = await supabase
    .from('internship_interviews')
    .select('*')
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  return (data as Interview[]) ?? []
}

export async function createInterview(
  supabase: SupabaseClient,
  interview: {
    application_id: string
    type: InterviewType
    scheduled_at: string
    duration_mins?: number
    prep_notes?: string | null
  }
): Promise<Interview> {
  const userId = await requireUserId(supabase)
  const { data, error } = await supabase
    .from('internship_interviews')
    .insert({ ...interview, user_id: userId })
    .select('*')
    .single()
  if (error) throw error
  const created = data as Interview
  await logEvent(supabase, {
    application_id: created.application_id,
    event_type: 'interview_scheduled',
    description: `Scheduled ${created.type} interview`,
  })
  return created
}

export async function updateInterview(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Interview>
): Promise<void> {
  const { error } = await supabase
    .from('internship_interviews')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteInterview(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('internship_interviews').delete().eq('id', id)
  if (error) throw error
}

// ── Activity events ─────────────────────────────────────────────────────────
export async function fetchActivity(
  supabase: SupabaseClient,
  applicationId: string
): Promise<ActivityEvent[]> {
  const { data, error } = await supabase
    .from('internship_activity_events')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as ActivityEvent[]) ?? []
}

export async function logEvent(
  supabase: SupabaseClient,
  event: {
    application_id?: string
    contact_id?: string
    event_type: string
    description: string
  }
): Promise<void> {
  const userId = await requireUserId(supabase)
  const { error } = await supabase.from('internship_activity_events').insert({
    user_id: userId,
    application_id: event.application_id ?? null,
    contact_id: event.contact_id ?? null,
    event_type: event.event_type,
    description: event.description,
  })
  if (error) throw error
}

// ── Documents ───────────────────────────────────────────────────────────────
export async function fetchDocuments(
  supabase: SupabaseClient,
  applicationId: string
): Promise<InternshipDocument[]> {
  const { data, error } = await supabase
    .from('internship_documents')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as InternshipDocument[]) ?? []
}

export async function createDocument(
  supabase: SupabaseClient,
  doc: {
    application_id: string
    label: string
    file_url?: string | null
    external_url?: string | null
    type: InternshipDocument['type']
  }
): Promise<InternshipDocument> {
  const userId = await requireUserId(supabase)
  const { data, error } = await supabase
    .from('internship_documents')
    .insert({ ...doc, user_id: userId })
    .select('*')
    .single()
  if (error) throw error
  return data as InternshipDocument
}

export async function deleteDocument(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('internship_documents').delete().eq('id', id)
  if (error) throw error
}

// ── Tasks ───────────────────────────────────────────────────────────────────
export async function fetchTasks(supabase: SupabaseClient): Promise<Task[]> {
  const { data, error } = await supabase
    .from('internship_tasks')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data as Task[]) ?? []
}

export async function createTask(
  supabase: SupabaseClient,
  task: {
    title: string
    due_date?: string | null
    application_id?: string | null
    contact_id?: string | null
  }
): Promise<Task> {
  const userId = await requireUserId(supabase)
  const { data, error } = await supabase
    .from('internship_tasks')
    .insert({ ...task, user_id: userId })
    .select('*')
    .single()
  if (error) throw error
  return data as Task
}

export async function updateTask(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Task>
): Promise<void> {
  const { error } = await supabase.from('internship_tasks').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteTask(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('internship_tasks').delete().eq('id', id)
  if (error) throw error
}

// ── Weekly goals ────────────────────────────────────────────────────────────
export async function fetchWeeklyGoals(supabase: SupabaseClient): Promise<WeeklyGoal[]> {
  const { data, error } = await supabase
    .from('internship_weekly_goals')
    .select('*')
    .order('week_start', { ascending: true })
  if (error) throw error
  return (data as WeeklyGoal[]) ?? []
}

export async function upsertWeeklyGoal(
  supabase: SupabaseClient,
  weekStart: string,
  targetApps: number
): Promise<void> {
  const userId = await requireUserId(supabase)
  const { error } = await supabase
    .from('internship_weekly_goals')
    .upsert(
      { user_id: userId, week_start: weekStart, target_apps: targetApps },
      { onConflict: 'user_id,week_start' }
    )
  if (error) throw error
}

// ── Settings ────────────────────────────────────────────────────────────────
export async function fetchSettings(
  supabase: SupabaseClient
): Promise<InternshipSettings> {
  const userId = await requireUserId(supabase)
  const { data, error } = await supabase
    .from('internship_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (data) return data as InternshipSettings
  const { data: created, error: insertErr } = await supabase
    .from('internship_settings')
    .insert({ user_id: userId })
    .select('*')
    .single()
  if (insertErr) throw insertErr
  return created as InternshipSettings
}

export async function updateSettings(
  supabase: SupabaseClient,
  patch: Partial<InternshipSettings>
): Promise<void> {
  const userId = await requireUserId(supabase)
  const { error } = await supabase
    .from('internship_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) throw error
}
