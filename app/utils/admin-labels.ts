export const orderStatusLabels: Record<string, string> = {
  NEW: 'Nuevo',
  CONTACTED: 'Contactado',
  CONFIRMED: 'Confirmado',
  PAYMENT_PENDING: 'Pago pendiente',
  PAID: 'Pagado',
  PREPARING: 'Preparando',
  READY: 'Listo',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado'
}
export const ticketStatusLabels: Record<string, string> = {
  NEW: 'Nuevo',
  ASSIGNED: 'Asignado',
  IN_REVIEW: 'En revisión',
  WAITING_CUSTOMER: 'Esperando al cliente',
  QUOTED: 'Cotizado',
  APPROVED: 'Aprobado',
  IN_PROGRESS: 'En proceso',
  COMPLETED: 'Completado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado'
}
export function adminLabel(value: string) {
  const labels: Record<string, string> = {
    ...orderStatusLabels,
    ...ticketStatusLabels,
    LOW: 'Baja',
    NORMAL: 'Normal',
    HIGH: 'Alta',
    URGENT: 'Urgente',
    PHYSICAL: 'Producto físico',
    DIGITAL: 'Producto digital',
    INFORMATIONAL: 'Informativa',
    INITIAL: 'Inventario inicial',
    PURCHASE: 'Compra',
    ADJUSTMENT_IN: 'Ajuste de entrada',
    ADJUSTMENT_OUT: 'Ajuste de salida',
    RETURN: 'Devolución',
    SALE: 'Venta',
    RESERVATION: 'Reserva',
    RELEASE: 'Liberación',
    TRANSFER_IN: 'Traslado de entrada',
    TRANSFER_OUT: 'Traslado de salida',
    TEXT: 'Texto corto',
    TEXTAREA: 'Texto largo',
    NUMBER: 'Número',
    BOOLEAN: 'Sí / No',
    SELECT: 'Selección única',
    MULTISELECT: 'Selección múltiple',
    DATE: 'Fecha',
    EMAIL: 'Correo electrónico',
    PHONE: 'Teléfono',
    WEB: 'Tienda online',
    WEBSITE: 'Tienda online',
    STOREFRONT: 'Tienda online',
    ADMIN: 'Administración'
  }
  return labels[value] || value
}
export function statusColor(value: string): 'success' | 'error' | 'warning' | 'info' | 'neutral' {
  if (['DELIVERED', 'COMPLETED', 'PAID', 'APPROVED'].includes(value)) return 'success'
  if (value === 'CANCELLED') return 'error'
  if (['PAYMENT_PENDING', 'WAITING_CUSTOMER', 'NEW'].includes(value)) return 'warning'
  return 'info'
}
