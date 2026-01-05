import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCart } from '../context/CartContext'
import { Search, Info, ShoppingCart, CheckCircle, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Products() {
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedProduct, setSelectedProduct] = useState<any>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const { items, addItem, removeItem, total, clearCart } = useCart()
    const navigate = useNavigate()
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [lastOrderStatus, setLastOrderStatus] = useState<'pending' | 'draft'>('pending')

    // Address State
    const [addresses, setAddresses] = useState<any[]>([])
    const [selectedAddressId, setSelectedAddressId] = useState<string>('')

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()

            // Fetch Products
            const { data: productsData } = await supabase
                .from('products')
                .select('*')
                .order('name');

            if (productsData) {
                const mappedProducts = productsData.map(p => ({
                    ...p,
                    sizes: p.variants || [],
                    image: p.image_url
                }));
                setProducts(mappedProducts);
            }

            // Fetch Addresses if user exists
            if (user) {
                const { data: addressData } = await supabase
                    .from('delivery_addresses')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('is_default', { ascending: false });

                if (addressData) {
                    setAddresses(addressData);
                    // Select default or first address
                    const defaultAddr = addressData.find(a => a.is_default) || addressData[0];
                    if (defaultAddr) setSelectedAddressId(defaultAddr.id);
                }
            }

            setLoading(false)
        }
        fetchData()
    }, [])

    const filteredItems = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddToCart = (product: any, size: string) => {
        if (!size) {
            alert('Kérjük válasszon méretet!');
            return;
        }

        const price = product.base_price || 0;
        addItem({
            productId: product.id,
            name: product.name,
            size: size,
            price: price,
            image: product.image_url
        });
    };

    const handleSubmitOrder = async (status: 'pending' | 'draft' = 'pending') => {
        if (items.length === 0) return;

        // Validation for Delivery Address (only for non-draft orders)
        if (status === 'pending' && !selectedAddressId) {
            alert('Kérjük válasszon szállítási címet a rendelés leadásához!');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                alert('Kérjük jelentkezzen be a rendeléshez!');
                return;
            }

            // Get full address object
            const selectedAddress = addresses.find(a => a.id === selectedAddressId);

            // 1. Create Order
            const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert({
                    user_id: user.id,
                    total_amount: total,
                    status: status,
                    order_number: orderNumber,
                    shipping_address: selectedAddress || null // Save snapshot
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Create Order Items
            const orderItems = items.map(item => ({
                order_id: orderData.id,
                product_id: item.productId,
                quantity: item.quantity,
                unit_price: item.price,
                size: item.size,
                product_name: item.name
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;


            // 3. Trigger Email
            if (status === 'pending') {
                supabase.functions.invoke('send-email', {
                    body: {
                        type: 'new_order',
                        data: {
                            order_number: orderNumber,
                            total_amount: total,
                            user_email: user.email,
                            order_id: orderData.id
                        }
                    }
                }).then(({ error }) => {
                    if (error) console.error('Error sending email:', error);
                });
            }

            // Success
            clearCart();
            setLastOrderStatus(status);
            setShowSuccessModal(true);
        } catch (error) {
            console.error('Error submitting order:', error);
            alert(`Hiba történt a rendelés leadásakor: ${(error as any).message || 'Ismeretlen hiba'}`);
        }
    }

    const handleCloseSuccess = () => {
        setShowSuccessModal(false);
        navigate('/orders');
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Termékek betöltése...</div>

    return (
        <div className="font-sans space-y-6 h-[calc(100vh-140px)] flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex-none">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-sempermed-text tracking-tight">Termék Portfólió</h2>
                        <p className="text-gray-500 mt-1">Böngésszen teljes kínálatunkban</p>
                    </div>
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Keresés..."
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-sempermed-green/20 focus:border-sempermed-green w-64 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </header>
            </div>

            <div className="flex-1 flex gap-6 min-h-0">
                {/* Product List - Scrollable */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {filteredItems.map(product => (
                        <div key={product.id} className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition-all duration-300 group">
                            <div className="w-32 h-32 bg-gray-50 rounded-xl flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-300">
                                <img
                                    src={product.image_url || "/api/placeholder/150/150"}
                                    alt={product.name}
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-xs font-bold text-sempermed-gold uppercase tracking-wider">{product.category}</span>
                                            <h3 className="font-bold text-lg text-sempermed-text leading-tight mt-1">{product.name}</h3>
                                        </div>
                                        <button
                                            onClick={() => setSelectedProduct(product)}
                                            className="p-2 text-gray-400 hover:text-sempermed-green hover:bg-sempermed-green/10 rounded-full transition-colors"
                                        >
                                            <Info size={20} />
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {(product.variants || []).map((variant: any) => (
                                            <button
                                                key={variant.size}
                                                onClick={() => handleAddToCart(product, variant.size)}
                                                className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:border-sempermed-green hover:text-sempermed-green transition-colors"
                                            >
                                                {variant.size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-end justify-between mt-2">
                                    <div className="text-xl font-bold text-sempermed-text">
                                        {Number(product.base_price).toLocaleString()} Ft
                                        <span className="text-xs text-gray-400 font-normal ml-1">/ doboz</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Cart Sidebar - Fixed/Sticky within container */}
                <div className="w-96 flex-none bg-white rounded-[30px] shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                    <div className="p-6 bg-gray-50 border-b border-gray-100">
                        <h3 className="font-bold text-lg text-sempermed-text flex items-center gap-2">
                            <ShoppingCart size={20} />
                            Rendelési Kosár
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                                <ShoppingCart size={48} strokeWidth={1.5} />
                                <p className="font-medium">A kosár üres</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-6 min-h-[200px]">
                                    {items.map((item) => (
                                        <div key={`${item.productId}-${item.size}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <div className="flex-1">
                                                <div className="font-bold text-sempermed-text text-sm line-clamp-1">{item.name}</div>
                                                <div className="text-xs text-gray-500">Méret: {item.size}</div>
                                                <div className="font-bold text-sempermed-green text-sm mt-1">{item.price.toLocaleString()} Ft</div>
                                            </div>
                                            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
                                                <button
                                                    onClick={() => removeItem(item.productId, item.size)}
                                                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    -
                                                </button>
                                                <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                                <button
                                                    onClick={() => addItem(item)}
                                                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-sempermed-green transition-colors"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="p-6 bg-gray-50 border-t border-gray-100">
                        {/* Delivery Address Selector */}
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Szállítási Cím</label>
                            {addresses.length > 0 ? (
                                <select
                                    value={selectedAddressId}
                                    onChange={(e) => setSelectedAddressId(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-sempermed-green focus:outline-none"
                                >
                                    {addresses.map(addr => (
                                        <option key={addr.id} value={addr.id}>
                                            {addr.site_name} - {addr.address}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">
                                    Nincs mentett cím. <br />
                                    <button
                                        onClick={() => navigate('/account')}
                                        className="text-red-700 underline font-bold mt-1"
                                    >
                                        Cím hozzáadása
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-end mb-4">
                            <span className="text-gray-500">Összesen:</span>
                            <span className="text-2xl font-bold text-sempermed-text">{total.toLocaleString()} Ft</span>
                        </div>
                        <div className="space-y-3">
                            <button
                                onClick={() => handleSubmitOrder('pending')}
                                disabled={items.length === 0}
                                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Rendelés leadása
                            </button>
                            <button
                                onClick={() => handleSubmitOrder('draft')}
                                disabled={items.length === 0}
                                className="w-full px-6 py-3 bg-white text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 text-sm"
                            >
                                Mentés piszkozatként
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product Detail Modal */}
            {selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}>
                    <div className="bg-white rounded-[30px] p-8 max-w-2xl w-full shadow-2xl relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setSelectedProduct(null)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="flex gap-8">
                            <div className="w-1/3">
                                <div className="aspect-square bg-gray-50 rounded-2xl flex items-center justify-center p-4">
                                    <img src={selectedProduct.image_url} alt={selectedProduct.name} className="max-w-full max-h-full object-contain" />
                                </div>
                            </div>
                            <div className="w-2/3">
                                <span className="text-xs font-bold text-sempermed-gold uppercase tracking-wider">{selectedProduct.category}</span>
                                <h2 className="text-2xl font-bold text-sempermed-text mb-4 mt-1">{selectedProduct.name}</h2>

                                <div className="space-y-4">
                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                            <CheckCircle size={16} className="text-sempermed-green" />
                                            Specifikációk
                                        </h4>
                                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                                            {selectedProduct.specifications && Object.entries(selectedProduct.specifications).map(([key, value]: [string, any]) => (
                                                <div key={key} className="contents">
                                                    <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                                                    <span className="font-medium text-gray-900">{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                        <span className="text-2xl font-bold text-sempermed-green">
                                            {Number(selectedProduct.base_price).toLocaleString()} Ft
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[30px] p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95 duration-200">
                        <div className={`w-16 h-16 ${lastOrderStatus === 'draft' ? 'bg-gray-100' : 'bg-sempermed-green/10'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                            {lastOrderStatus === 'draft' ? (
                                <ShoppingCart size={32} className="text-gray-600" />
                            ) : (
                                <CheckCircle size={32} className="text-sempermed-green" />
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-sempermed-text mb-2">
                            {lastOrderStatus === 'draft' ? 'Piszkozat mentve!' : 'Köszönjük a megrendelést!'}
                        </h3>
                        <p className="text-gray-500 mb-6">
                            {lastOrderStatus === 'draft'
                                ? 'A kosár tartalmát sikeresen mentettük piszkozatként.'
                                : 'Rendelését sikeresen rögzítettük rendszerünkben.'}
                        </p>
                        <button
                            onClick={handleCloseSuccess}
                            className="w-full btn-primary"
                        >
                            Rendben
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
