<template>
  <div
    class="min-h-screen bg-slate-950 text-white"
    data-public-app
    :data-hydrated="hydrated ? 'true' : 'false'"
  >
    <PublicHeader />
    <main id="main-content" class="min-h-[70vh]"><slot /></main>
    <PublicFooter />
  </div>
</template>

<script setup lang="ts">
const hydrated = ref(false)

onMounted(() => {
  hydrated.value = true
})
</script>
