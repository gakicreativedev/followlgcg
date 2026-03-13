import { createClient } from './supabase'
import { Profile } from '@/types/database'

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@followlgcg.app`
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Busca por auth_user_id primeiro (usuários novos), fallback para email
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .eq('status', 'ativo')
    .single()

  return data ?? null
}
