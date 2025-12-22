// middleware/auth.global.ts
export default defineNuxtRouteMiddleware(async (to, from) => {
  // Use the NEW name here
  const { user } = useAuth() 

  const publicRoutes = ['/login', '/auth/callback']
  
  if (publicRoutes.includes(to.path)) {
    // If user is logged in and trying to go to login, redirect home
    if (user.value && to.path === '/login') {
      return navigateTo('/')
    }
    return
  }

  // If no user is logged in, redirect to login
  if (!user.value) {
    return navigateTo('/login')
  }
})