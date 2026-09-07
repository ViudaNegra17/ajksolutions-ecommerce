<script setup lang="ts">
import type { PublicProductCard } from '#shared/types/public-catalog'
import { resolvePublicProductAction } from '#shared/utils/public-catalog'

const props = defineProps<{ product: PublicProductCard }>()
const cart = useCartStore()
const toast = useToast()
const action = computed(() => resolvePublicProductAction(props.product))
const canAddDirectly = computed(() => action.value === 'ADD_TO_CART')
const actionLabel = computed(() => {
  if (action.value === 'CONTACT') return 'Consultar precio'
  if (action.value === 'BUY_NOW') return 'Comprar ahora'
  if (action.value === 'ADD_TO_CART') return 'Agregar al carrito'
  return 'Ver producto'
})
function addToCart() {
  if (!canAddDirectly.value) return
  const added = cart.addItem({
    productId: props.product.id,
    variantId: null,
    quantity: 1,
    productType: 'PHYSICAL',
    name: props.product.name,
    variantName: null,
    slug: props.product.slug,
    image: props.product.image?.url || null,
    displayPrice: props.product.price.amount || '0.00'
  })
  if (added)
    toast.add({ title: 'Producto agregado', description: 'Tu carrito fue actualizado.', color: 'success' })
}
onMounted(() => cart.hydrate())
</script>

<template>
  <article
    class="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 transition hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-xl hover:shadow-cyan-950/30"
  >
    <NuxtLink
      :to="`/productos/${product.slug}`"
      class="relative block aspect-[4/3] overflow-hidden bg-slate-800"
    >
      <NuxtImg
        v-if="product.image"
        :src="product.image.url"
        :alt="product.image.alt"
        width="480"
        height="360"
        format="webp"
        loading="lazy"
        class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />
      <div v-else class="grid h-full place-items-center bg-gradient-to-br from-slate-800 to-slate-900">
        <UIcon name="i-lucide-image" class="size-12 text-slate-600" aria-hidden="true" />
        <span class="sr-only">Producto sin imagen</span>
      </div>
      <span
        v-if="product.featured"
        class="absolute left-3 top-3 rounded-full bg-cyan-400 px-2.5 py-1 text-xs font-bold text-slate-950"
      >
        Destacado
      </span>
    </NuxtLink>
    <div class="flex flex-1 flex-col p-5">
      <UBadge
        v-if="product.promotion"
        :label="product.promotion.badge"
        color="warning"
        variant="soft"
        class="mb-3 self-start"
      />
      <UBadge
        v-if="product.productType !== 'PHYSICAL'"
        label="Licencia digital"
        color="info"
        variant="soft"
        class="mb-3 self-start"
      />
      <p class="text-xs font-semibold uppercase tracking-wider text-cyan-400">
        {{ product.brand?.name || product.category.name }}
      </p>
      <h3 class="mt-2 text-lg font-bold leading-snug text-white">
        <NuxtLink :to="`/productos/${product.slug}`" class="hover:text-cyan-300">
          {{ product.name }}
        </NuxtLink>
      </h3>
      <p v-if="product.shortDescription" class="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
        {{ product.shortDescription }}
      </p>
      <div class="mt-auto space-y-4 pt-5">
        <PublicProductPrice :price="product.price" />
        <PublicProductAvailability
          v-if="product.productType === 'PHYSICAL'"
          :availability="product.availability"
        />
        <p v-else class="text-sm text-cyan-200">Entrega digital coordinada por WhatsApp</p>
        <UButton
          v-if="action === 'ADD_TO_CART'"
          :label="actionLabel"
          icon="i-lucide-shopping-cart"
          block
          data-testid="card-add-to-cart"
          @click="addToCart"
        />
        <UButton
          v-else
          :to="action === 'CONTACT' ? '/servicios#contacto' : `/productos/${product.slug}`"
          :label="actionLabel"
          :icon="action === 'BUY_NOW' ? 'i-lucide-zap' : 'i-lucide-arrow-right'"
          :trailing="action !== 'BUY_NOW'"
          block
        />
      </div>
    </div>
  </article>
</template>
