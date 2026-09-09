<script setup lang="ts">
defineProps<{ groups: Array<{ label: string; items: Array<{ label: string; to: string; icon: string }> }> }>()
const emit = defineEmits<{ navigate: [] }>()
</script>

<template>
  <nav class="space-y-5" aria-label="Administración">
    <section v-for="group in groups" :key="group.label">
      <p class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted">{{ group.label }}</p>
      <UButton
        v-for="item in group.items"
        :key="item.to"
        :to="item.to"
        :label="item.label"
        :icon="item.icon"
        color="neutral"
        variant="ghost"
        active-color="primary"
        active-variant="soft"
        :exact="true"
        block
        class="justify-start"
        @click="emit('navigate')"
      />
    </section>
  </nav>
</template>
