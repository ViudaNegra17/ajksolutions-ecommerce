import type { CartDisplayItem } from '#shared/types/orders'

const STORAGE_KEY = 'ajksolutions-cart'
const VERSION = 3

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartDisplayItem[]>([])
  const hydrated = ref(false)
  const itemCount = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))

  function persist() {
    if (import.meta.client && hydrated.value) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, items: items.value }))
    }
  }

  function hydrate() {
    if (!import.meta.client || hydrated.value) return
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as {
        version?: number
        items?: CartDisplayItem[]
      } | null
      if (parsed?.version && [1, 2, VERSION].includes(parsed.version) && Array.isArray(parsed.items)) {
        items.value = parsed.items
          .filter(
            (item) =>
              item.productId &&
              item.productType === 'PHYSICAL' &&
              Number.isInteger(item.quantity) &&
              item.quantity >= 1 &&
              item.quantity <= 99
          )
          .map((item) => ({ ...item, productType: 'PHYSICAL' as const }))
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
    hydrated.value = true
    persist()
  }

  function addItem(item: CartDisplayItem) {
    if (item.productType !== 'PHYSICAL') return false
    const existing = items.value.find(
      (candidate) => candidate.productId === item.productId && candidate.variantId === item.variantId
    )
    if (existing) existing.quantity = Math.min(99, existing.quantity + Math.max(1, item.quantity))
    else items.value.push({ ...item, quantity: Math.min(99, Math.max(1, item.quantity)) })
    persist()
    return true
  }

  function removeItem(productId: string, variantId: string | null) {
    items.value = items.value.filter(
      (item) => !(item.productId === productId && item.variantId === variantId)
    )
    persist()
  }

  function updateQuantity(productId: string, variantId: string | null, quantity: number) {
    const item = items.value.find(
      (candidate) => candidate.productId === productId && candidate.variantId === variantId
    )
    if (!item) return
    item.quantity = Math.min(99, Math.max(1, Math.trunc(quantity || 1)))
    persist()
  }

  function clearCart() {
    items.value = []
    persist()
  }

  return { items, hydrated, itemCount, hydrate, addItem, removeItem, updateQuantity, clearCart }
})
