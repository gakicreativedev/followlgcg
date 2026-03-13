import { createClient } from './supabase'
import { Profile } from '@/types/database'

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@followlgcg.app`
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Busca por auth_user_id (novo) ou email (fallback legado)
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (data) return data

  // Fallback: buscar por email para contas legadas
  const { data: fallback } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', user.email)
    .single()

  return fallback ?? null
}
