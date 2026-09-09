<script setup lang="ts">
defineProps<{ status: string; domain?: 'order' | 'ticket' }>()
</script>

<template>
  <UBadge :color="statusColor(status)" variant="soft">{{
    (domain === 'order' ? orderStatusLabels : ticketStatusLabels)[status] || adminLabel(status)
  }}</UBadge>
</template>
