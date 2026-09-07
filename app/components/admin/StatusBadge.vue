<script setup lang="ts">
defineProps<{ active: boolean }>()
</script>

<template>
  <UBadge :color="active ? 'success' : 'neutral'" variant="soft">
    {{ active ? 'Activo' : 'Inactivo' }}
  </UBadge>
</template>
