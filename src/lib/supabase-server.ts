import { createClient } from '@supabase/supabase-js'

// Cliente con service_role para operaciones del servidor (ignora RLS)
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
