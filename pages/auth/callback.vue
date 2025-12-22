<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500 mx-auto mb-4"></div>
      <p class="text-gray-600">Completing sign in...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const supabase = useSupabase()
const router = useRouter()

onMounted(async () => {
  // Handle the OAuth callback
  const { data, error } = await supabase.auth.getSession()
  
  if (error) {
    console.error('Auth callback error:', error)
    router.push('/login')
    return
  }

  if (data.session) {
    // Successfully authenticated
    router.push('/')
  } else {
    router.push('/login')
  }
})
</script>