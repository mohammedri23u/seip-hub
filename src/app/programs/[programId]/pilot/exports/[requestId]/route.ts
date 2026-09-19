import { requireProgramRole } from '@/lib/auth/require-program-role'
export async function POST(_request: Request, { params }: { params: Promise<{ programId: string; requestId: string }> }) {
  const { programId, requestId } = await params
  const { supabase } = await requireProgramRole(programId, ['program_director','assessment_lead','reviewer'])
  const { data: request } = await supabase.from('research_export_requests').select('id').eq('id',requestId).eq('program_id',programId).maybeSingle()
  if (!request) return Response.json({ error: 'Export unavailable' }, { status:404 })
  const { data, error } = await supabase.rpc('generate_research_export', { target_request_id: requestId })
  if (error) return Response.json({ error:'Export blocked. Check approval, expiry, consent and ethics governance.' }, { status:403 })
  return new Response(JSON.stringify(data, null, 2), { headers:{
    'Content-Type':'application/json', 'Content-Disposition':'attachment; filename="the-ten-research-ratings.json"',
    'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',
  }})
}
