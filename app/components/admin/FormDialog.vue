<script setup lang="ts">
defineProps<{ title: string }>()
const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    description="Completa los campos y guarda los cambios."
    :ui="{ content: 'sm:max-w-3xl' }"
  >
    <template #body><slot /></template>
  </UModal>
</template>
