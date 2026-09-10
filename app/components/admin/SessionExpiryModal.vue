<script setup lang="ts">
defineProps<{ open: boolean; loading?: boolean }>()
const emit = defineEmits<{ continue: []; logout: [] }>()
</script>

<template>
  <UModal
    :open="open"
    title="Sesión por expirar"
    description="Tu sesión administrativa está por expirar por inactividad."
    :dismissible="false"
  >
    <template #footer>
      <div class="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <UButton
          label="Cerrar sesión"
          color="neutral"
          variant="outline"
          :disabled="loading"
          @click="emit('logout')"
        />
        <UButton
          label="Seguir conectado"
          icon="i-lucide-shield-check"
          :loading="loading"
          @click="emit('continue')"
        />
      </div>
    </template>
  </UModal>
</template>
