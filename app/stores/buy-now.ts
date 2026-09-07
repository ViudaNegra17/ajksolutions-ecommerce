export type BuyNowItem = {
  productId: string
  variantId: string | null
  quantity: 1
  productType: 'DIGITAL'
}

const STORAGE_KEY = 'ajksolutions-buy-now'
const VERSION = 2

export const useBuyNowStore = defineStore('buy-now', () => {
  const item = ref<BuyNowItem | null>(null)
  const hydrated = ref(false)

  function persist() {
    if (!import.meta.client || !hydrated.value) return
    if (item.value)
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, item: item.value }))
    else sessionStorage.removeItem(STORAGE_KEY)
  }

  function hydrate() {
    if (!import.meta.client || hydrated.value) return
    try {
      const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null') as {
        version?: number
        item?: BuyNowItem
      } | null
      if (
        parsed?.version === VERSION &&
        parsed.item?.productType === 'DIGITAL' &&
        parsed.item.quantity === 1 &&
        typeof parsed.item.productId === 'string'
      ) {
        item.value = {
          productId: parsed.item.productId,
          variantId: typeof parsed.item.variantId === 'string' ? parsed.item.variantId : null,
          quantity: 1,
          productType: 'DIGITAL'
        }
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY)
    }
    hydrated.value = true
    persist()
  }

  function start(productId: string, variantId: string | null) {
    item.value = { productId, variantId, quantity: 1, productType: 'DIGITAL' }
    persist()
  }

  function clear() {
    item.value = null
    persist()
  }

  return { item, hydrated, hydrate, start, clear }
})
