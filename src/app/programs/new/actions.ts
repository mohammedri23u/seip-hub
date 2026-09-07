'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

export async function createProgram(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const code = String(formData.get('code') ?? '').trim().toUpperCase()
  const description = String(formData.get('description') ?? '').trim()

  if (!name || !code) redirect('/programs/new?error=missing_fields')
  if (!/^[A-Z0-9_-]{2,20}$/.test(code)) redirect('/programs/new?error=invalid_code')

  const { supabase, userId } = await requireUser()
  const { data: admin } = await supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle()
  if (!admin) redirect('/dashboard')

  const { data: program, error } = await supabase
    .from('programs')
    .insert({ name, code, description: description || null, status: 'active', created_by: userId })
    .select('id')
    .single()

  if (error || !program) redirect('/programs/new?error=create_failed')

  const { error: membershipError } = await supabase.from('program_memberships').insert({
    program_id: program.id,
    user_id: userId,
    role: 'program_director',
    status: 'active',
  })

  if (membershipError) redirect('/programs/new?error=membership_failed')

  revalidatePath('/dashboard')
  redirect(`/programs/${program.id}`)
}
