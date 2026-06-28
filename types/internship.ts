// ── Enums (mirror the DB check constraints) ─────────────────────────────────
export type CityTag = 'indy' | 'chicago' | 'austin' | 'remote' | 'other'
export type Lane = 'lane1_program' | 'lane2_portal' | 'lane3_startup'
export type RoleType =
  | 'swe'
  | 'embedded'
  | 'backend'
  | 'robotics'
  | 'ml'
  | 'hardware'
  | 'product'
  | 'other'
export type Stage = 'wishlist' | 'applied' | 'oa' | 'interview' | 'offer' | 'closed'
export type ClosedReason = 'rejected' | 'withdrawn' | 'ghosted' | 'accepted_other'
export type Priority = 'high' | 'medium' | 'low'
export type ReferralStatus = 'none' | 'seeking' | 'secured'
export type CreatedVia = 'manual' | 'ingestion'

export type AtsPlatform = 'greenhouse' | 'lever' | 'ashby'

export type ContactSource = 'purdue' | 'nsbe' | 'career_fair' | 'cold' | 'event' | 'other'
export type PipelineState = 'contacted' | 'replied' | 'call_done' | 'referred' | 'dormant'

export type InterviewType = 'oa' | 'phone' | 'technical' | 'onsite' | 'behavioral'
export type InterviewOutcome = 'passed' | 'failed' | 'pending' | 'no_show' | 'cancelled'

export type DocumentType = 'resume' | 'cover_letter' | 'other'

// ── Ordered stage / state lists for the boards ──────────────────────────────
export const STAGES: Stage[] = ['wishlist', 'applied', 'oa', 'interview', 'offer', 'closed']
export const PIPELINE_STATES: PipelineState[] = [
  'contacted',
  'replied',
  'call_done',
  'referred',
  'dormant',
]

export const STAGE_LABELS: Record<Stage, string> = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  oa: 'OA',
  interview: 'Interview',
  offer: 'Offer',
  closed: 'Closed',
}

export const PIPELINE_LABELS: Record<PipelineState, string> = {
  contacted: 'Contacted',
  replied: 'Replied',
  call_done: 'Call Done',
  referred: 'Referred',
  dormant: 'Dormant',
}

export const LANE_LABELS: Record<Lane, string> = {
  lane1_program: 'Lane 1 · Program',
  lane2_portal: 'Lane 2 · Portal',
  lane3_startup: 'Lane 3 · Startup',
}

export const LANE_SHORT: Record<Lane, string> = {
  lane1_program: 'L1',
  lane2_portal: 'L2',
  lane3_startup: 'L3',
}

export const CITY_LABELS: Record<CityTag, string> = {
  indy: 'Indy',
  chicago: 'Chicago',
  austin: 'Austin',
  remote: 'Remote',
  other: 'Other',
}

export const ROLE_TYPE_LABELS: Record<RoleType, string> = {
  swe: 'SWE',
  embedded: 'Embedded',
  backend: 'Backend',
  robotics: 'Robotics',
  ml: 'ML',
  hardware: 'Hardware',
  product: 'Product',
  other: 'Other',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const REFERRAL_LABELS: Record<ReferralStatus, string> = {
  none: 'None',
  seeking: 'Seeking',
  secured: 'Secured',
}

export const CONTACT_SOURCE_LABELS: Record<ContactSource, string> = {
  purdue: 'Purdue',
  nsbe: 'NSBE',
  career_fair: 'Career Fair',
  cold: 'Cold',
  event: 'Event',
  other: 'Other',
}

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  oa: 'OA',
  phone: 'Phone Screen',
  technical: 'Technical',
  onsite: 'Onsite',
  behavioral: 'Behavioral',
}

// ── Row types ───────────────────────────────────────────────────────────────
export interface Application {
  id: string
  user_id: string
  company: string
  role_title: string
  job_url: string | null
  location: string | null
  city_tag: CityTag
  lane: Lane
  role_type: RoleType
  stage: Stage
  closed_reason: ClosedReason | null
  priority: Priority
  is_paid_confirmed: boolean
  deadline: string | null
  applied_at: string | null
  referral_status: ReferralStatus
  notes: string | null
  sort_order: number
  season: string | null
  work_auth_flag: boolean
  created_via: CreatedVia
  source: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  user_id: string
  name: string
  company: string | null
  role_title: string | null
  linkedin_url: string | null
  email: string | null
  source: ContactSource
  pipeline_state: PipelineState
  next_action: string | null
  next_action_date: string | null
  linked_application_id: string | null
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Interview {
  id: string
  user_id: string
  application_id: string
  type: InterviewType
  scheduled_at: string
  duration_mins: number
  prep_notes: string | null
  outcome: InterviewOutcome | null
  created_at: string
  updated_at: string
}

export interface ActivityEvent {
  id: string
  user_id: string
  application_id: string | null
  contact_id: string | null
  event_type: string
  description: string
  created_at: string
}

export interface InternshipDocument {
  id: string
  user_id: string
  application_id: string
  label: string
  file_url: string | null
  external_url: string | null
  type: DocumentType
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  application_id: string | null
  contact_id: string | null
  title: string
  due_date: string | null
  done: boolean
  created_at: string
}

export interface WeeklyGoal {
  id: string
  user_id: string
  week_start: string
  target_apps: number
  created_at: string
}

export interface InternshipSettings {
  user_id: string
  email_nudges_enabled: boolean
  digest_email: string | null
  created_at: string
  updated_at: string
}

// ── Insert / patch shapes ───────────────────────────────────────────────────
export type ApplicationInsert = Partial<
  Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>
> & {
  company: string
  role_title: string
}

export type ContactInsert = Partial<
  Omit<Contact, 'id' | 'user_id' | 'created_at' | 'updated_at'>
> & {
  name: string
}

// ── Ingestion ───────────────────────────────────────────────────────────────
export interface Target {
  id: string
  user_id: string
  company: string
  ats_platform: AtsPlatform | null
  ats_slug: string | null
  careers_url: string | null
  active: boolean
  created_at: string
}

/** A classified posting the routine POSTs to /api/internship/ingest. The API
 *  ignores any priority sent and computes it from the lane/city matrix. */
export interface IngestCandidate {
  company: string
  role_title: string
  job_url?: string | null
  location?: string | null
  city_tag?: CityTag
  lane?: Lane
  role_type?: RoleType
  season?: string
  is_paid_confirmed?: boolean
  work_auth_flag?: boolean
  deadline?: string | null
  source?: string | null
  /** Posting date, used only to order the 50-row cap (freshest first). */
  posted_at?: string | null
}

export interface IngestRequest {
  run_at?: string
  first_run?: boolean
  candidates: IngestCandidate[]
}

export interface IngestResponse {
  inserted: number
  skipped_duplicates: number
  skipped_season: number
  capped: boolean
  deadline_alerts: number
}
