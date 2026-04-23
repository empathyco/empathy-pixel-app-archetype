export type CartToastType = 'addSuccess' | 'addError' | 'removeSuccess' | 'removeError'

interface CartToastMessage {
  message: string
  duration?: number
}

const cartToastMessages: Record<CartToastType, CartToastMessage> = {
  addSuccess: {
    message: 'Producto agregado al carrito',
    duration: 3000,
  },
  addError: {
    message: 'No se pudo agregar el producto al carrito',
    duration: 5000,
  },
  removeSuccess: {
    message: 'Producto eliminado del carrito',
    duration: 3000,
  },
  removeError: {
    message: 'No se pudo eliminar el producto del carrito',
    duration: 5000,
  },
}

export const getCartToastMessage = (type: CartToastType): CartToastMessage =>
  cartToastMessages[type]
