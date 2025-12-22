import { createClient } from '@supabase/supabase-js'

export const useSupabase = () => {
  const config = useRuntimeConfig()
  
  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.public.supabaseKey as string
  )

  return supabase
}

export const useSupabaseUser = () => {
  const supabase = useSupabase()
  const user = useState('supabase_user', () => null)

  const fetchUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    user.value = authUser
    return authUser
  }

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      user.value = null
      navigateTo('/login')
    }
    return { error }
  }

  return {
    user,
    fetchUser,
    signInWithGoogle,
    signOut
  }
}