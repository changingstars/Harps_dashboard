import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { exportToPDF, exportToExcel } from '../utils/exportUtils'
import { CheckCircle, Clock, ChevronRight, Package, FileText, FileSpreadsheet } from 'lucide-react'

export default function Orders() {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState<any>(null)

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                profiles:user_id (company_name, tax_id, email, address, city, zip, phone),
                order_items (
                    *,
                    products (name, image_url)
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching orders:', error)
        } else {
            setOrders(data || [])
        }
        setLoading(false)
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Rendelések betöltése...</div>

    return (
        <div className="font-sans space-y-6 animate-in fade-in duration-300">
            <header>
                <h2 className="text-2xl font-bold text-sempermed-text tracking-tight">Rendeléseim</h2>
                <p className="text-gray-500 mt-1">Korábbi rendelések és státuszok követése.</p>
            </header>

            <div className="bg-white rounded-[30px] shadow-sm border border-gray-100 overflow-hidden">
                {orders.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <Package className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                        <p className="font-medium">Még nincs leadott rendelése.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rendelésszám</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Dátum</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Státusz</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Összeg</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.map((order) => (
                                    <tr
                                        key={order.id}
                                        onClick={() => setSelectedOrder(order)}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4 font-bold text-sempermed-text group-hover:text-sempermed-green transition-colors">
                                            {order.order_number || order.id.slice(0, 8)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(order.created_at).toLocaleDateString('hu-HU')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${order.status === 'pending' ? 'bg-sempermed-gold/10 text-sempermed-gold' :
                                                order.status === 'confirmed' ? 'bg-blue-100 text-blue-600' :
                                                    order.status === 'shipped' ? 'bg-purple-100 text-purple-600' :
                                                        order.status === 'draft' ? 'bg-gray-100 text-gray-500' :
                                                            'bg-sempermed-green/10 text-sempermed-green'
                                                }`}>
                                                {order.status === 'pending' ? <Clock className="w-3 h-3" /> :
                                                    order.status === 'confirmed' ? <FileText className="w-3 h-3" /> :
                                                        order.status === 'shipped' ? <Package className="w-3 h-3" /> :
                                                            order.status === 'draft' ? <FileText className="w-3 h-3" /> :
                                                                <CheckCircle className="w-3 h-3" />}
                                                {order.status === 'pending' ? 'Függőben' :
                                                    order.status === 'confirmed' ? 'Visszaigazolva' :
                                                        order.status === 'shipped' ? 'Szállítjuk' :
                                                            order.status === 'draft' ? 'Piszkozat' : 'Teljesítve'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-sempermed-text">
                                            {order.total_amount?.toLocaleString()} Ft
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-400 group-hover:text-sempermed-green">
                                            <ChevronRight size={20} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Invoice Style Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
                    <div
                        className="bg-white w-full max-w-3xl rounded-[20px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Invoice Header */}
                        <div className="bg-gray-50 border-b border-gray-100 p-8 flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-bold text-sempermed-text">Rendelési Összesítő</h3>
                                <p className="text-gray-500 mt-1">#{selectedOrder.order_number || selectedOrder.id}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-500 font-medium uppercase tracking-wide">Dátum</div>
                                <div className="font-bold text-gray-900">{new Date(selectedOrder.created_at).toLocaleDateString('hu-HU')}</div>
                                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wide mt-2 ${selectedOrder.status === 'pending' ? 'bg-sempermed-gold/10 text-sempermed-gold' :
                                    selectedOrder.status === 'confirmed' ? 'bg-blue-100 text-blue-600' :
                                        selectedOrder.status === 'shipped' ? 'bg-purple-100 text-purple-600' :
                                            selectedOrder.status === 'draft' ? 'bg-gray-100 text-gray-500' :
                                                'bg-sempermed-green/10 text-sempermed-green'
                                    }`}>
                                    {selectedOrder.status === 'pending' ? 'Függőben' :
                                        selectedOrder.status === 'confirmed' ? 'Visszaigazolva' :
                                            selectedOrder.status === 'shipped' ? 'Szállítjuk' :
                                                selectedOrder.status === 'draft' ? 'Piszkozat' : 'Teljesítve'}
                                </div>
                            </div>
                        </div>

                        {/* Invoice Items */}
                        <div className="p-8 min-h-[300px]">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                        <th className="pb-3 font-semibold">Tétel</th>
                                        <th className="pb-3 font-semibold text-center">Méret</th>
                                        <th className="pb-3 font-semibold text-center">Mennyiség</th>
                                        <th className="pb-3 font-semibold text-right">Egységár</th>
                                        <th className="pb-3 font-semibold text-right">Összesen</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {selectedOrder.order_items.map((item: any) => (
                                        <tr key={item.id}>
                                            <td className="py-4">
                                                <div className="font-bold text-gray-900">{item.product_name}</div>
                                                <div className="text-xs text-gray-500">{item.products?.sku}</div>
                                            </td>
                                            <td className="py-4 text-center text-sm font-medium text-gray-600">{item.size}</td>
                                            <td className="py-4 text-center text-sm font-medium text-gray-600">{item.quantity} db</td>
                                            <td className="py-4 text-right text-sm text-gray-600">{item.unit_price?.toLocaleString()} Ft</td>
                                            <td className="py-4 text-right font-bold text-gray-900">{(item.unit_price * item.quantity).toLocaleString()} Ft</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Invoice Footer / Totals */}
                        <div className="bg-gray-50 p-8 border-t border-gray-100">
                            <div className="flex justify-end">
                                <div className="w-64 space-y-3">
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>Részösszeg:</span>
                                        <span>{selectedOrder.total_amount?.toLocaleString()} Ft</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-500 border-b border-gray-200 pb-3">
                                        <span>ÁFA (27%):</span>
                                        <span>{(selectedOrder.total_amount * 0.27).toLocaleString()} Ft</span>
                                    </div>
                                    <div className="flex justify-between text-xl font-bold text-sempermed-green pt-1">
                                        <span>Végösszeg:</span>
                                        <span>{(selectedOrder.total_amount * 1.27).toLocaleString()} Ft</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
                                <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-800 font-medium text-sm">
                                    Bezárás
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => exportToExcel(selectedOrder)}
                                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-bold"
                                    >
                                        <FileSpreadsheet size={18} />
                                        Excel Letöltése
                                    </button>
                                    <button
                                        onClick={() => exportToPDF(selectedOrder)}
                                        className="flex items-center gap-2 px-4 py-2 bg-sempermed-green text-white rounded-lg hover:bg-sempermed-green-dark transition-colors text-sm font-bold"
                                    >
                                        <FileText size={18} />
                                        PDF Letöltése
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
