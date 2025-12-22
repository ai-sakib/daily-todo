<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500 mx-auto mb-4"></div>
      <p class="text-gray-600">Completing sign in...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const user = useSupabaseUser() // Use the reactive user object

watch(user, (newUser) => {
  if (newUser) {
    return navigateTo('/')
  }
}, { immediate: true })
</script>