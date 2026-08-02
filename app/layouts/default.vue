<template>
  <div class="min-h-screen">
    <AppHeader />

    <main class="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pb-16 sm:pt-8">
      <slot />
    </main>

    <AppMobileNav />
    <AppToastHost />
    <AppConfirmDialog />
  </div>
</template>
