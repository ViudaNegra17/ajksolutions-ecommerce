<script setup lang="ts">
import type { ApiSuccess } from '#shared/types/api'

type Suggestions = {
  products: Array<{ name: string; slug: string }>
  categories: Array<{ name: string; slug: string }>
  brands: Array<{ name: string; slug: string }>
}
const route = useRoute()
const id = useId()
const query = ref(typeof route.query.search === 'string' ? route.query.search : '')
const suggestions = ref<Suggestions | null>(null)
const open = ref(false)
const loading = ref(false)
const failed = ref(false)
const active = ref(-1)
const root = useTemplateRef('root')
let timer: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | undefined
let revision = 0
const options = computed(() => [
  ...(suggestions.value?.products || []).map((item) => ({
    label: item.name,
    kind: 'Producto',
    to: '/productos/' + item.slug
  })),
  ...(suggestions.value?.categories || []).map((item) => ({
    label: item.name,
    kind: 'Categoría',
    to: '/categoria/' + item.slug
  })),
  ...(suggestions.value?.brands || []).map((item) => ({
    label: item.name,
    kind: 'Marca',
    to: '/productos?brand=' + encodeURIComponent(item.slug)
  }))
])
watch(
  () => route.query.search,
  (value) => {
    query.value = typeof value === 'string' ? value : ''
    open.value = false
  }
)
watch(query, (value) => {
  const request = ++revision
  clearTimeout(timer)
  controller?.abort()
  suggestions.value = null
  loading.value = false
  failed.value = false
  active.value = -1
  open.value = value.trim().length >= 2
  if (!open.value) return
  loading.value = true
  timer = setTimeout(async () => {
    const pending = new AbortController()
    controller = pending
    try {
      const response = await $fetch<ApiSuccess<Suggestions>>('/api/search', {
        query: { q: value.trim() },
        signal: pending.signal
      })
      if (request === revision) suggestions.value = response.data
    } catch {
      if (request === revision && !pending.signal.aborted) failed.value = true
    } finally {
      if (request === revision) loading.value = false
    }
  }, 320)
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  controller?.abort()
})
async function submit() {
  const selected = active.value >= 0 ? options.value[active.value] : undefined
  open.value = false
  await navigateTo(
    selected?.to || { path: '/productos', query: query.value.trim() ? { search: query.value.trim() } : {} }
  )
}
function move(direction: number) {
  if (!options.value.length) return
  open.value = true
  active.value = (active.value + direction + options.value.length) % options.value.length
}
function blur(event: FocusEvent) {
  if (!root.value?.contains(event.relatedTarget as Node | null)) open.value = false
}
function clearQuery() {
  query.value = ''
  root.value?.querySelector('input')?.focus()
}
</script>

<template>
  <form
    ref="root"
    class="relative w-full"
    role="search"
    @submit.prevent="submit"
    @focusout="blur"
    @keydown.esc="open = false"
  >
    <label :for="id" class="sr-only">Buscar productos</label>
    <div class="relative">
      <UIcon
        name="i-lucide-search"
        class="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted"
      />
      <input
        :id="id"
        v-model="query"
        type="search"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-expanded="open"
        :aria-controls="id + '-results'"
        :aria-activedescendant="open && active >= 0 ? id + '-option-' + active : undefined"
        placeholder="Busca productos, marcas o categorías"
        class="public-input pl-10 pr-12"
        @focus="open = query.trim().length >= 2"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
      />
      <UButton
        v-if="query"
        type="button"
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        class="absolute right-0 top-0"
        aria-label="Limpiar búsqueda"
        @click="clearQuery"
      />
    </div>
    <div
      v-if="open"
      class="absolute inset-x-0 top-12 z-50 max-h-80 overflow-auto rounded-xl border border-default bg-default p-2 shadow-lg"
    >
      <p v-if="loading" role="status" class="p-3 text-sm text-muted">Buscando…</p>
      <p v-else-if="failed" role="status" class="p-3 text-sm text-muted">
        No pudimos cargar las sugerencias. Pulsa Enter para buscar.
      </p>
      <p v-else-if="!options.length" role="status" class="p-3 text-sm text-muted">
        No encontramos coincidencias.
      </p>
      <ul :id="id + '-results'" role="listbox" aria-label="Sugerencias">
        <li
          v-for="(item, index) in options"
          :id="id + '-option-' + index"
          :key="item.to"
          role="option"
          :aria-selected="active === index"
        >
          <NuxtLink
            :to="item.to"
            class="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted"
            :class="active === index && 'bg-muted text-primary'"
            @click="open = false"
          >
            <span>{{ item.label }}</span
            ><span class="text-xs text-muted">{{ item.kind }}</span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </form>
</template>
