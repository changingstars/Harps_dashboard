import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCart } from '../context/CartContext'
import { Search, Info, ShoppingCart, CheckCircle, X, Box, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Products() {
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedProduct, setSelectedProduct] = useState<any>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const { items, addItem, removeItem, updateQuantity, total, clearCart } = useCart()
    const navigate = useNavigate()
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [lastOrderStatus, setLastOrderStatus] = useState<'pending' | 'draft'>('pending')
    const [selectedAddressId, setSelectedAddressId] = useState<string>('')
    const [addresses, setAddresses] = useState<any[]>([])
    const [warehouseAddress, setWarehouseAddress] = useState<string>('')
    const [orderComment, setOrderComment] = useState('')

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
                const mappedProducts = productsData.map(p => {
                    const specs = p.specifications || {};
                    // Parse packaging info with defaults
                    const packaging = {
                        unit: specs.packaging_unit || 'par',
                        itemsPerDispenser: Number(specs.items_per_dispenser) || 1, // Avoid division by zero
                        dispensersPerCarton: Number(specs.dispensers_per_carton) || 1
                    };

                    return {
                        ...p,
                        sizes: p.variants || [],
                        image: p.image_url,
                        packaging,
                        unitPrice: Math.round(p.base_price / packaging.itemsPerDispenser), // Calculated Unit Price
                        cartonPrice: p.base_price * packaging.dispensersPerCarton // Calculated Carton Price
                    }
                });
                setProducts(mappedProducts);
            }

            // Fetch Addresses
            if (user) {
                const { data: addressData } = await supabase
                    .from('delivery_addresses')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('is_default', { ascending: false });

                if (addressData) {
                    setAddresses(addressData);
                    const defaultAddr = addressData.find(a => a.is_default) || addressData[0];
                    if (defaultAddr) setSelectedAddressId(defaultAddr.id);
                }
            }

            // Fetch Warehouse Address
            const { data: settingsData } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'warehouse_address')
                .single();

            if (settingsData) {
                setWarehouseAddress(settingsData.value);
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

        // Add CARTON to cart
        // Price stored in cart is the Carton Price
        addItem({
            productId: product.id,
            name: `${product.name}`, // Simplify name, size will distinguish
            size: `${size} (Karton: ${product.packaging.dispensersPerCarton} db)`,
            price: product.cartonPrice,
            image: product.image_url
        });
    };

    const handleSubmitOrder = async (status: 'pending' | 'draft' = 'pending') => {
        if (items.length === 0) return;

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

            let selectedAddress;
            if (selectedAddressId === 'warehouse_pickup') {
                selectedAddress = {
                    site_name: 'Raktári Felvétel',
                    address: warehouseAddress,
                    contact_name: user?.user_metadata?.full_name || 'Partner',
                    contact_phone: user?.user_metadata?.phone || '',
                    contact_email: user?.email
                };
            } else {
                selectedAddress = addresses.find(a => a.id === selectedAddressId);
            }

            const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert({
                    user_id: user.id,
                    total_amount: total,
                    status: status,
                    order_number: orderNumber,
                    shipping_address: selectedAddress || null,
                    comment: orderComment
                })
                .select()
                .single();

            if (orderError) throw orderError;

            const orderItems = items
                .filter(item => item.quantity > 0)
                .map(item => ({
                    order_id: orderData.id,
                    product_id: item.productId,
                    quantity: item.quantity, // This is now Number of Cartons
                    unit_price: item.price,    // This is Price per Carton
                    size: item.size,
                    product_name: item.name
                }));

            const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
            if (itemsError) throw itemsError;

            // Trigger Emails (Pending status only)
            if (status === 'pending') {
                // ... (Existing email logic preserved)
                supabase.functions.invoke('send-email', {
                    body: { type: 'new_order', data: { order_number: orderNumber, total_amount: total, user_email: user.email, order_id: orderData.id } }
                });
                supabase.functions.invoke('send-email', {
                    body: { type: 'new_order_admin', data: { order_number: orderNumber, total_amount: total, user_email: user.email, order_id: orderData.id } }
                });
            }

            setOrderComment('');
            clearCart();
            setLastOrderStatus(status);
            setShowSuccessModal(true);
        } catch (error) {
            console.error('Error submitting order:', error);
            alert(`Hiba történt a rendelés leadásakor: ${(error as any).message}`);
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
                {/* Product List */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {filteredItems.map(product => (
                        <div key={product.id} className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition-all duration-300 group">
                            <div className="w-32 h-32 bg-gray-50 rounded-xl flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-300 relative group-hover:border-sempermed-green group-hover:border">
                                <img
                                    src={product.image_url || "/api/placeholder/150/150"}
                                    alt={product.name}
                                    className="max-w-full max-h-full object-contain mix-blend-multiply"
                                />
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-xs font-bold text-sempermed-gold uppercase tracking-wider">{product.category}</span>
                                            <h3 className="font-bold text-lg text-sempermed-text leading-tight mt-1">{product.name}</h3>

                                            {/* Packaging Info Badge */}
                                            <div className="flex gap-2 mt-2">
                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg border border-gray-100 text-xs font-medium text-gray-600">
                                                    <Box size={12} className="text-sempermed-green" />
                                                    {product.packaging.itemsPerDispenser} {product.packaging.unit} / doboz
                                                </div>
                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50/50 rounded-lg border border-blue-100 text-xs font-medium text-blue-700">
                                                    <Package size={12} />
                                                    {product.packaging.dispensersPerCarton} doboz / karton
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <button
                                                onClick={() => setSelectedProduct(product)}
                                                className="p-2 text-gray-400 hover:text-sempermed-green hover:bg-sempermed-green/10 rounded-full transition-colors mb-2"
                                            >
                                                <Info size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {(product.variants || []).map((variant: any) => (
                                            <button
                                                key={variant.size}
                                                onClick={() => handleAddToCart(product, variant.size)}
                                                className="px-3 py-1.5 text-sm font-bold border border-gray-200 bg-white rounded-lg hover:border-sempermed-green hover:text-white hover:bg-sempermed-green transition-all shadow-sm"
                                            >
                                                {variant.size}
                                                <span className="text-[10px] font-normal ml-1 opacity-70">
                                                    (Karton)
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-end justify-between mt-4 border-t border-gray-50 pt-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Egységár</span>
                                        <span className="text-sm font-medium text-gray-600">{product.unitPrice.toLocaleString()} Ft / {product.packaging.unit}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="text-2xl font-bold text-sempermed-text leading-none">
                                            {product.base_price.toLocaleString()} Ft
                                            <span className="text-xs text-gray-400 font-normal ml-1">/ doboz</span>
                                        </div>
                                        <span className="text-xs font-bold text-sempermed-green mt-1 bg-sempermed-green/5 px-2 py-0.5 rounded">
                                            {product.cartonPrice.toLocaleString()} Ft / karton
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Cart Sidebar */}
                <div className="w-[440px] flex-none bg-white rounded-[30px] shadow-sm border border-gray-100 flex flex-col overflow-hidden">
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
                            <div className="space-y-3">
                                {items.map((item) => (
                                    <div key={`${item.productId}-${item.size}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex-1">
                                            <div className="font-bold text-sempermed-text text-sm line-clamp-1">{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.size}</div>
                                            <div className="font-bold text-sempermed-green text-sm mt-1">{item.price.toLocaleString()} Ft / karton</div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                                            <button
                                                onClick={() => {
                                                    if (item.quantity > 1) {
                                                        updateQuantity(item.productId, item.size, item.quantity - 1);
                                                    } else {
                                                        removeItem(item.productId, item.size);
                                                    }
                                                }}
                                                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.quantity > 0 ? item.quantity : ''}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    updateQuantity(item.productId, item.size, isNaN(val) ? 0 : val);
                                                }}
                                                className="w-10 text-center text-sm font-bold border-none focus:ring-0 p-0 text-gray-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <button
                                                onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                                                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-sempermed-green transition-colors"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                                    {warehouseAddress && (
                                        <option value="warehouse_pickup" className="font-bold text-sempermed-green">
                                            🏢 Raktári felvétel ({warehouseAddress})
                                        </option>
                                    )}
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

                        {/* Comment Section */}
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Megjegyzés</label>
                            <textarea
                                value={orderComment}
                                onChange={(e) => setOrderComment(e.target.value)}
                                placeholder="Egyéb kérés, megjegyzés a futárnak..."
                                className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-sempermed-green focus:outline-none resize-none"
                                rows={3}
                            />
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
                        <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
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
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                            <Package size={16} className="text-sempermed-green" />
                                            Csomagolás
                                        </h4>
                                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                                            <div className="text-gray-500">Egység:</div>
                                            <div className="font-medium text-gray-900">{selectedProduct.packaging.unit === 'par' ? 'Pár' : 'Darab'}</div>
                                            <div className="text-gray-500">Doboz tartalom:</div>
                                            <div className="font-medium text-gray-900">{selectedProduct.packaging.itemsPerDispenser} {selectedProduct.packaging.unit}</div>
                                            <div className="text-gray-500">Karton tartalom:</div>
                                            <div className="font-medium text-gray-900">{selectedProduct.packaging.dispensersPerCarton} doboz</div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                            <CheckCircle size={16} className="text-sempermed-green" />
                                            Specifikációk
                                        </h4>
                                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                                            {selectedProduct.specifications && Object.entries(selectedProduct.specifications)
                                                .filter(([key]) => !['packaging_unit', 'items_per_dispenser', 'dispensers_per_carton'].includes(key))
                                                .map(([key, value]: [string, any]) => (
                                                    <div key={key} className="contents">
                                                        <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                                                        <span className="font-medium text-gray-900">{value}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                        <div>
                                            <div className="text-3xl font-bold text-sempermed-text">
                                                {selectedProduct.base_price?.toLocaleString()} Ft
                                                <span className="text-sm text-gray-400 font-normal ml-2">/ doboz</span>
                                            </div>
                                            <div className="text-sm font-bold text-sempermed-green mt-1">
                                                {selectedProduct.cartonPrice?.toLocaleString()} Ft / karton
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal preserved from original code... */}
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
