<script setup lang="ts">
defineProps<{ open: boolean; title: string; description: string; loading?: boolean }>()
const emit = defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-60 grid place-items-center bg-black/70 p-4"
    role="dialog"
    aria-modal="true"
  >
    <UCard class="w-full max-w-md bg-slate-900 ring-white/10">
      <h2 class="text-xl font-bold">{{ title }}</h2>
      <p class="mt-2 text-slate-400">{{ description }}</p>
      <div class="mt-6 flex justify-end gap-2">
        <UButton label="Cancelar" color="neutral" variant="ghost" @click="emit('close')" />
        <UButton label="Confirmar" color="error" :loading="loading" @click="emit('confirm')" />
      </div>
    </UCard>
  </div>
</template>
