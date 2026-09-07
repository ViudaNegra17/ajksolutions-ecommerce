<script setup lang="ts">
import type { PublicVariant, PublicVariantOption } from '#shared/types/public-catalog'

const props = defineProps<{ variants: PublicVariant[] }>()
const model = defineModel<PublicVariant | null>({ required: true })
const selected = reactive<Record<string, string>>({})

const groups = computed(() => {
  const result = new Map<string, { name: string; slug: string; options: PublicVariantOption[] }>()
  for (const variant of props.variants) {
    for (const option of variant.options) {
      const group = result.get(option.attributeSlug) || {
        name: option.attribute,
        slug: option.attributeSlug,
        options: []
      }
      if (!group.options.some((item) => item.value === option.value)) group.options.push(option)
      result.set(option.attributeSlug, group)
    }
  }
  return [...result.values()]
})

function syncSelection(variant: PublicVariant | null) {
  for (const key of Object.keys(selected)) delete selected[key]
  for (const option of variant?.options || []) selected[option.attributeSlug] = option.value
}

watch(model, syncSelection, { immediate: true })

function candidateFor(attributeSlug: string, value: string) {
  return props.variants.find((variant) =>
    variant.options.every((option) => {
      const expected = option.attributeSlug === attributeSlug ? value : selected[option.attributeSlug]
      return !expected || option.value === expected
    })
  )
}

function choose(attributeSlug: string, value: string) {
  const candidate = candidateFor(attributeSlug, value)
  if (!candidate) return
  model.value = candidate
  syncSelection(candidate)
}
</script>

<template>
  <fieldset v-if="variants.length" class="space-y-5">
    <legend class="mb-3 text-sm font-semibold text-slate-200">Selecciona una variante</legend>
    <div v-for="group in groups" :key="group.slug">
      <p class="mb-2 text-sm text-slate-400">{{ group.name }}</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in group.options"
          :key="option.value"
          type="button"
          :disabled="!candidateFor(group.slug, option.value)"
          :aria-pressed="selected[group.slug] === option.value"
          :class="[
            'min-h-11 rounded-xl border px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-30',
            selected[group.slug] === option.value
              ? 'border-cyan-400 bg-cyan-400 text-slate-950'
              : 'border-white/15 bg-slate-900 text-slate-200 hover:border-cyan-400/50'
          ]"
          @click="choose(group.slug, option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
  </fieldset>
</template>
