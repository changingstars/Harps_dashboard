import { createContext, useContext, useState, type ReactNode } from 'react'

export interface CartItem {
    productId: string
    name: string
    price: number
    quantity: number
    size: string
    image?: string
}

interface CartContextType {
    items: CartItem[]
    addItem: (item: Omit<CartItem, 'quantity'>) => void
    removeItem: (productId: string, size: string) => void
    updateQuantity: (productId: string, size: string, quantity: number) => void
    clearCart: () => void
    total: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([])

    const addItem = (newItem: Omit<CartItem, 'quantity'>) => {
        setItems((prev) => {
            const existing = prev.find((i) => i.productId === newItem.productId && i.size === newItem.size)
            if (existing) {
                return prev.map((i) =>
                    (i.productId === newItem.productId && i.size === newItem.size) ? { ...i, quantity: i.quantity + 1 } : i
                )
            }
            return [...prev, { ...newItem, quantity: 1 }]
        })
    }

    const removeItem = (productId: string, size: string) => {
        setItems((prev) => prev.filter((i) => !(i.productId === productId && i.size === size)))
    }

    const updateQuantity = (productId: string, size: string, quantity: number) => {
        if (quantity < 0) return; // Prevent negative
        setItems((prev) => prev.map((i) =>
            (i.productId === productId && i.size === size) ? { ...i, quantity } : i
        ));
    }

    const clearCart = () => setItems([])

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total }}>
            {children}
        </CartContext.Provider>
    )
}

export const useCart = () => {
    const context = useContext(CartContext)
    if (!context) throw new Error('useCart must be used within a CartProvider')
    return context
}
