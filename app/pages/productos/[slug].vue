<script setup lang="ts">
import type { ApiSuccess } from '#shared/types/api'
import type { PublicProductCard, PublicProductDetail, PublicVariant } from '#shared/types/public-catalog'
import {
  buildBreadcrumbStructuredData,
  buildProductStructuredData,
  seoFallback,
  serializeJsonLd
} from '#shared/utils/public-catalog'

const route = useRoute()
const config = useRuntimeConfig()
const slug = String(route.params.slug)
const { data, error } = await useAsyncData(`public-product-${slug}`, () =>
  $fetch<ApiSuccess<PublicProductDetail>>(`/api/products/${slug}`)
)
if (error.value)
  throw createError({
    statusCode: error.value.statusCode || 500,
    statusMessage: error.value.statusCode === 404 ? 'Producto no encontrado' : 'No se pudo cargar el producto'
  })
const product = computed(() => data.value!.data)
const selectedVariant = ref<PublicVariant | null>(product.value.variants[0] || null)
const cart = useCartStore()
const buyNow = useBuyNowStore()
const toast = useToast()
const displayPrice = computed(() => selectedVariant.value?.price || product.value.price)
const displayAvailability = computed(() => selectedVariant.value?.availability || product.value.availability)
const displaySku = computed(() => selectedVariant.value?.sku || product.value.sku)
const canAdd = computed(
  () =>
    product.value.productType === 'PHYSICAL' &&
    displayPrice.value.mode === 'FIXED' &&
    displayAvailability.value.available &&
    (!product.value.variants.length || Boolean(selectedVariant.value))
)
const canBuy = computed(
  () =>
    product.value.productType === 'DIGITAL' &&
    displayPrice.value.mode === 'FIXED' &&
    displayAvailability.value.available &&
    (!product.value.variants.length || Boolean(selectedVariant.value))
)
function addToCart() {
  if (!canAdd.value) return
  cart.addItem({
    productId: product.value.id,
    variantId: selectedVariant.value?.id || null,
    quantity: 1,
    productType: product.value.productType,
    name: product.value.name,
    variantName: selectedVariant.value?.name || null,
    slug: product.value.slug,
    image: product.value.images[0]?.url || null,
    displayPrice: displayPrice.value.amount || '0.00'
  })
  toast.add({ title: 'Producto agregado', description: 'Tu carrito fue actualizado.', color: 'success' })
}
async function buy() {
  if (!canBuy.value) return
  buyNow.start(product.value.id, selectedVariant.value?.id || null)
  await navigateTo({
    path: `/productos/${slug}/comprar`,
    query: selectedVariant.value ? { variant: selectedVariant.value.id } : undefined
  })
}
onMounted(() => {
  cart.hydrate()
  buyNow.hydrate()
})
const { data: relatedResponse } = await useAsyncData(`related-${slug}`, () =>
  $fetch<ApiSuccess<PublicProductCard[]>>(`/api/products/${slug}/related`)
)
const related = computed(() => relatedResponse.value?.data || [])
const canonical = `${config.public.appUrl}/productos/${slug}`
const title = computed(() => seoFallback(product.value.metaTitle, product.value.name, 'Producto'))
const description = computed(() =>
  seoFallback(
    product.value.metaDescription,
    product.value.shortDescription,
    `Conoce ${product.value.name} en AjkSolutionS.`
  )
)

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonical,
  ogType: 'website',
  ogImage: () => product.value.images[0]?.url,
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: () => product.value.images[0]?.url
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: serializeJsonLd(buildProductStructuredData(product.value, canonical))
    },
    {
      type: 'application/ld+json',
      innerHTML: serializeJsonLd(
        buildBreadcrumbStructuredData(product.value.breadcrumbs, String(config.public.appUrl))
      )
    }
  ]
}))
</script>

<template>
  <NuxtPage v-if="route.path.endsWith('/comprar')" />
  <UContainer v-else class="py-8 lg:py-12">
    <PublicBreadcrumbs :items="product.breadcrumbs" />
    <div class="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
      <PublicProductGallery :images="product.images" :product-name="product.name" />
      <div>
        <div class="flex flex-wrap gap-2">
          <UBadge v-if="product.featured" label="Destacado" variant="soft" />
          <UBadge
            v-if="product.productType !== 'PHYSICAL'"
            label="Digital / Licencia"
            color="info"
            variant="soft"
          />
          <UBadge :label="product.category.name" color="neutral" variant="outline" />
        </div>
        <p v-if="product.brand" class="mt-5 text-sm font-bold uppercase tracking-widest text-primary">
          {{ product.brand.name }}
        </p>
        <h1 class="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{{ product.name }}</h1>
        <p v-if="product.shortDescription" class="mt-5 text-lg leading-8 text-default">
          {{ product.shortDescription }}
        </p>
        <div class="mt-7 rounded-2xl border border-default bg-default p-5">
          <PublicProductPrice :price="displayPrice" size="lg" />
          <div v-if="product.productType === 'PHYSICAL'" class="mt-4 border-t border-default pt-4">
            <PublicProductAvailability :availability="displayAvailability" />
          </div>
          <p v-else class="mt-4 border-t border-default pt-4 text-sm text-primary">
            Producto digital · entrega coordinada por WhatsApp
          </p>
          <p class="mt-4 text-xs text-muted">SKU: {{ displaySku }} · Código: {{ product.productCode }}</p>
        </div>
        <div v-if="product.variants.length" class="mt-7">
          <PublicProductVariantSelector v-model="selectedVariant" :variants="product.variants" />
        </div>
        <UButton
          v-if="displayPrice.mode === 'CONTACT'"
          to="/servicios#contacto"
          label="Consultar precio"
          icon="i-lucide-message-circle"
          size="xl"
          class="mt-7"
        />
        <UButton
          v-else-if="product.productType === 'PHYSICAL'"
          :disabled="!canAdd"
          label="Agregar al carrito"
          icon="i-lucide-shopping-cart"
          size="xl"
          class="mt-7"
          data-testid="add-to-cart"
          @click="addToCart"
        />
        <UButton
          v-else
          :disabled="!canBuy"
          label="Comprar ahora"
          icon="i-lucide-zap"
          size="xl"
          class="mt-7"
          data-testid="digital-buy-now"
          @click="buy"
        />
        <p v-if="product.variants.length && !selectedVariant" class="mt-2 text-sm text-amber-800">
          Selecciona una variante antes de agregar el producto.
        </p>
        <p v-if="product.productType === 'DIGITAL'" class="mt-3 text-sm text-primary">
          Compra individual. El pago y la entrega manual del producto digital se coordinan por WhatsApp.
        </p>
        <p v-if="product.warranty" class="mt-7 flex items-start gap-2 text-sm text-default">
          <UIcon name="i-lucide-shield-check" class="mt-0.5 size-5 text-primary" />
          <span><strong>Garantía:</strong> {{ product.warranty }}</span>
        </p>
      </div>
    </div>
    <div class="mt-16 grid gap-12 lg:grid-cols-[1.2fr_.8fr]">
      <section v-if="product.description" aria-labelledby="product-description">
        <h2 id="product-description" class="text-2xl font-black">Descripción</h2>
        <div class="mt-5 whitespace-pre-line leading-8 text-default">{{ product.description }}</div>
      </section>
      <PublicProductSpecifications :specifications="product.specifications" />
    </div>
    <section
      v-if="related.length"
      class="mt-20 border-t border-default pt-14"
      aria-labelledby="related-products"
    >
      <h2 id="related-products" class="mb-7 text-3xl font-black">Productos relacionados</h2>
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <PublicProductCard v-for="item in related.slice(0, 8)" :key="item.slug" :product="item" />
      </div>
    </section>
  </UContainer>
</template>
