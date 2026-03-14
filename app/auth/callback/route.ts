import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as any)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if profile exists for this OAuth user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

        if (!profile) {
          // Create profile for OAuth user
          await supabase.from('profiles').insert({
            id: crypto.randomUUID(),
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
            email: user.email || '',
            username: user.email?.split('@')[0] || '',
            auth_user_id: user.id,
            role: 'voluntario',
            status: 'pendente',
            avatar_url: user.user_metadata?.avatar_url || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
