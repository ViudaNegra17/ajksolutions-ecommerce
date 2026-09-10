<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    groups: Array<{ label: string; items: Array<{ label: string; to: string; icon: string }> }>
    collapsed?: boolean
  }>(),
  { collapsed: false }
)
const emit = defineEmits<{ navigate: [] }>()

const navigationGroups = computed(() =>
  props.groups.map((group) => ({
    ...group,
    items: group.items.map((item) =>
      Object.assign(
        {
          ...item,
          exact: true,
          onSelect: () => emit('navigate')
        },
        { 'aria-label': item.label }
      )
    )
  }))
)
</script>

<template>
  <nav data-admin-navigation class="flex flex-col gap-5" aria-label="Administración">
    <section
      v-for="(group, index) in navigationGroups"
      :key="group.label"
      :class="index && collapsed ? 'border-t border-default pt-5' : ''"
    >
      <p v-if="!collapsed" class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted">
        {{ group.label }}
      </p>
      <UNavigationMenu
        :items="group.items"
        orientation="vertical"
        :collapsed="collapsed"
        :tooltip="{ delayDuration: 0, content: { side: 'right' } }"
        color="primary"
        variant="pill"
        highlight
        class="w-full"
      />
    </section>
  </nav>
</template>
