import { createClient } from './supabase'
import { Profile } from '@/types/database'

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Busca por auth_user_id (principal)
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (data) return data

  // Fallback: buscar por email
  const { data: fallback } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', user.email)
    .single()

  return fallback ?? null
}
