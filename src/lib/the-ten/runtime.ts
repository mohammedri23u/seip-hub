import 'server-only'
import { requireUser } from '@/lib/auth/require-user'

export type JourneySummary = {
  enrolled: boolean
  profile?: { name?: string | null }
  program?: { id: string; name: string }
  cohort?: { id: string; name: string }
  onboarding_complete?: boolean
  pretest?: { id: string | null; title: string | null; status: string | null; completed: boolean }
  missions?: Array<{ id: string; position: number; title: string; mentor?: string | null; completed: boolean }>
  mission_completed_count?: number
  mission_required_count?: number
  posttest?: { id: string | null; title: string | null; status: string | null; completed: boolean }
  feedback_required?: boolean
  feedback_complete?: boolean
  attendance?: { completed: number; required: number }
  certificate_title?: string
  eligible?: boolean
  next_stage?: 'orientation' | 'configuration' | 'pretest' | 'missions' | 'posttest' | 'feedback' | 'attendance' | 'certificate'
  certificate?: { id: string; code: string; title: string; status: string; issued_at: string } | null
}

export type MissionCatalogEntry = {
  id: string
  title: string
  mentor: string | null
  mentor_title: string | null
  lens: string | null
  focus: string | null
  duration: number | null
  premise: string | null
  signalIndex: number | null
  published: boolean
}

export type MissionRunEntry = {
  id: string
  session_id: string
  mission_id: string
  title: string | null
  phase: string
  join_code: string | null
  manager: boolean
}

export type TenCatalog = {
  missions: MissionCatalogEntry[]
  runs: MissionRunEntry[]
  signals: number
  staff: boolean
  admin: boolean
}

export type TenStudio = {
  missions: Array<{ id: string; content: MissionCatalogEntry & Record<string, unknown>; published: boolean }>
  sessions: Array<{ id: string; title: string; join_code: string | null; cohort: string }>
  admin: boolean
}

export async function getJourneySummary(): Promise<JourneySummary> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase.rpc('journey_summary', { target_cohort_id: null })
  if (error) throw new Error(`Could not load THE TEN journey: ${error.message}`)
  return (data ?? { enrolled: false }) as JourneySummary
}

export async function getTenCatalog(): Promise<TenCatalog> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase.rpc('ten_api', { operation: 'catalog', payload: {} })
  if (error) throw new Error(`Could not load Baghdad Nexus: ${error.message}`)
  return (data ?? { missions: [], runs: [], signals: 0, staff: false, admin: false }) as TenCatalog
}

export async function getTenStudio(): Promise<TenStudio> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase.rpc('ten_api', { operation: 'studio', payload: {} })
  if (error) throw new Error(`Could not load facilitator studio: ${error.message}`)
  return (data ?? { missions: [], sessions: [], admin: false }) as TenStudio
}

export async function getTenSnapshot(runId: string) {
  const { supabase } = await requireUser()
  const { data, error } = await supabase.rpc('ten_api', { operation: 'snapshot', payload: { run_id: runId } })
  if (error) throw new Error(`Could not load live mission: ${error.message}`)
  return data as Record<string, unknown>
}

export async function getTenCodex() {
  const { supabase } = await requireUser()
  const { data, error } = await supabase.rpc('ten_api', { operation: 'codex', payload: {} })
  if (error) throw new Error(`Could not load My Codex: ${error.message}`)
  return (data ?? []) as Array<Record<string, unknown>>
}
