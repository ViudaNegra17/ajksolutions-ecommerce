<script setup lang="ts">
defineProps<{ open: boolean; title: string; description: string; loading?: boolean }>()
const emit = defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :description="description"
    :dismissible="!loading"
    @update:open="!$event && emit('close')"
  >
    <template #footer>
      <div class="flex w-full justify-end gap-3">
        <UButton
          label="Cancelar"
          color="neutral"
          variant="outline"
          :disabled="loading"
          @click="emit('close')"
        />
        <UButton
          label="Confirmar"
          color="error"
          :loading="loading"
          :disabled="loading"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </UModal>
</template>
