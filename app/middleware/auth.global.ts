const PUBLIC_ROUTES = ['/login', '/auth/callback']

export default defineNuxtRouteMiddleware(to => {
  const user = useSupabaseUser()
  const isPublic = PUBLIC_ROUTES.includes(to.path)

  if (isPublic) {
    // Signed-in users have no business on the login screen.
    if (user.value && to.path === '/login') return navigateTo('/')
    return
  }

  if (!user.value) {
    // Remember where they were going so sign-in can return them there.
    return navigateTo({ path: '/login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } })
  }
})
