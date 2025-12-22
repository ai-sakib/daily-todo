export default defineNuxtRouteMiddleware(async (to, from) => {
  const supabase = useSupabase()
  const { user, fetchUser } = useSupabaseUser()

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/auth/callback']
  
  if (publicRoutes.includes(to.path)) {
    return
  }

  // Check if user is authenticated
  if (!user.value) {
    await fetchUser()
  }

  const { data: { session } } = await supabase.auth.getSession()

  if (!session && !publicRoutes.includes(to.path)) {
    return navigateTo('/login')
  }

  if (session && to.path === '/login') {
    return navigateTo('/')
  }
})