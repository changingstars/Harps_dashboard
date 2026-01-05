import { useState, useEffect } from 'react';
import { Package, Clock, ShoppingCart } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useCart } from '../context/CartContext';

export default function Dashboard() {
    const [profile, setProfile] = useState<any>(null)
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const { items, total: cartTotal } = useCart()

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                // Fetch Profile
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                setProfile(profileData)

                // Fetch Orders
                const { data: ordersData } = await supabase
                    .from('orders')
                    .select(`
                        *,
                        order_items (count)
                    `)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })

                if (ordersData) {
                    setOrders(ordersData.map(o => ({
                        ...o,
                        items: o.order_items[0]?.count || 0
                    })))
                }
            }
            setLoading(false)
        }
        fetchData()
    }, [])

    const pendingOrders = orders.filter(o => o.status === 'pending').length;

    if (loading) return <div className="p-8 text-center text-gray-400">Betöltés...</div>

    return (
        <div className="space-y-6 font-sans text-sempermed-text">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-sempermed-text tracking-tight">
                        Üdvözöljük, {profile?.company_name || 'Partner'}!
                    </h2>
                    <p className="text-gray-500 mt-1">Rendelési Portál - Áttekintés</p>
                </div>
            </div>

            {/* Content Area */}
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Függőben lévő</p>
                                <p className="text-3xl font-bold text-sempermed-text mt-1">{pendingOrders}</p>
                            </div>
                            <div className="p-3 bg-sempermed-gold/10 rounded-2xl text-sempermed-gold">
                                <Clock size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Összes rendelés</p>
                                <p className="text-3xl font-bold text-sempermed-text mt-1">{orders.length}</p>
                            </div>
                            <div className="p-3 bg-sempermed-green/10 rounded-2xl text-sempermed-green">
                                <Package size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Aktív Kosár</p>
                                <p className="text-3xl font-bold text-sempermed-text mt-1">
                                    {items.length > 0 ? `${cartTotal.toLocaleString()} Ft` : '-'}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {items.length > 0 ? `${items.length} tétel` : 'Üres'}
                                </p>
                            </div>
                            <div className="p-3 bg-gray-100 rounded-2xl text-gray-600">
                                <ShoppingCart size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[30px] shadow-sm border border-gray-100 p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-sempermed-text">Legutóbbi rendelések</h3>
                    </div>
                    {orders.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">Még nincs rendelése.</p>
                    ) : (
                        <div className="space-y-3">
                            {orders.slice(0, 5).map(order => (
                                <div key={order.id} className="flex items-center justify-between p-4 bg-[#FAFAFA] rounded-2xl border border-gray-50">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-3 h-3 rounded-full ${order.status === 'pending' ? 'bg-sempermed-gold' :
                                            order.status === 'draft' ? 'bg-gray-300' :
                                                order.status === 'confirmed' ? 'bg-blue-500' :
                                                    order.status === 'shipped' ? 'bg-purple-500' :
                                                        'bg-sempermed-green'
                                            }`} />
                                        <div>
                                            <div className="font-bold text-sempermed-text group-hover:text-sempermed-green transition-colors">#{order.order_number || order.id.slice(0, 8)}</div>
                                            <div className="text-xs text-gray-500">
                                                {order.status === 'pending' ? 'Függőben' :
                                                    order.status === 'draft' ? 'Piszkozat' :
                                                        order.status === 'confirmed' ? 'Visszaigazolva' :
                                                            order.status === 'shipped' ? 'Szállítjuk' :
                                                                'Teljesítve'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-sempermed-text">{order.total_amount.toLocaleString()} Ft</p>
                                        <p className="text-xs text-gray-500">
                                            {order.items} tétel
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
