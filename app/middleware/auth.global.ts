const PUBLIC_ROUTES = ['/login', '/auth/callback']

/** Where an account that has not been approved yet is allowed to sit. */
const PENDING_ROUTE = '/pending'

/** Admin-only area, matched as a prefix so nested routes are covered too. */
const ADMIN_ROUTE = '/admin'

export default defineNuxtRouteMiddleware(async to => {
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

  // A session only proves the Google sign-in worked. Whether this account may
  // use the app is a separate decision, recorded in `profiles.status`, so hold
  // every protected route until we have read it.
  const { ensureProfile } = useAccess()
  const profile = await ensureProfile()

  if (profile?.status !== 'approved') {
    // Fails closed: a missing row or a failed lookup lands here too, and the
    // waiting screen explains which of the two it was.
    return to.path === PENDING_ROUTE ? undefined : navigateTo(PENDING_ROUTE)
  }

  // Approved — the waiting screen has nothing left to say.
  if (to.path === PENDING_ROUTE) return navigateTo('/')

  if (to.path === ADMIN_ROUTE || to.path.startsWith(`${ADMIN_ROUTE}/`)) {
    if (!profile.is_admin) return navigateTo('/')
  }
})
