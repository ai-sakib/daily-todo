// composables/useSupabase.ts

export const useSupabase = () => {
  return useSupabaseClient()
}

// RENAME this from useSupabaseUser to useAuth
export const useAuth = () => {
  const supabase = useSupabaseClient()
  
  // This uses the module's internal user state (synced via cookies automatically)
  const user = useSupabaseUser() 

  // fetchUser is largely redundant with the new module (cookies handle it), 
  // but we keep it here for compatibility with your code.
  const fetchUser = async () => {
    const { data } = await supabase.auth.getUser()
    return data.user
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