import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Clock, CheckCircle, Search, FileText, ChevronRight, Truck, FileCheck, X, FileSpreadsheet } from 'lucide-react';
import { exportToPDF, exportToExcel } from '../../utils/exportUtils';

export default function AdminOrders() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                profiles:user_id (company_name, email),
                order_items (
                    *,
                    products (name, sku, image_url)
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching orders:', error);
        } else {
            setOrders(data || []);
        }
        setLoading(false);
    };

    const updateStatus = async (orderId: string, newStatus: string) => {
        // if (!confirm(`Biztosan módosítani szeretnéd a státuszt erre: ${newStatus}?`)) return;

        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);

        if (error) {
            alert('Hiba történt a frissítés során.');
        } else {
            // Update local state
            fetchOrders();
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder({ ...selectedOrder, status: newStatus });
            }

            // Trigger Status Update Email
            // We need user email, so we need the full order object. 
            // 'orders' list or 'selectedOrder' has profiles info.
            const order = orders.find(o => o.id === orderId);
            if (order && order.profiles?.email) {
                supabase.functions.invoke('send-email', {
                    body: {
                        type: 'order_status',
                        data: {
                            order_number: order.order_number || order.id,
                            user_email: order.profiles.email,
                            status: newStatus
                        }
                    }
                }).then(({ error }) => { // Corrected syntax
                    if (error) console.error('Error sending email:', error);
                });
            }
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesFilter = filter === 'all' || order.status === filter;
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            order.profiles?.company_name?.toLowerCase().includes(searchLower) ||
            order.order_number?.toLowerCase().includes(searchLower) ||
            order.id.toLowerCase().includes(searchLower);

        return matchesFilter && matchesSearch;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-sempermed-gold/10 text-sempermed-gold';
            case 'confirmed': return 'bg-blue-100 text-blue-600';
            case 'shipped': return 'bg-purple-100 text-purple-600';
            case 'completed': return 'bg-sempermed-green/10 text-sempermed-green';
            case 'draft': return 'bg-gray-100 text-gray-500';
            default: return 'bg-gray-100 text-gray-500';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock className="w-3 h-3" />;
            case 'confirmed': return <FileCheck className="w-3 h-3" />;
            case 'shipped': return <Truck className="w-3 h-3" />;
            case 'completed': return <CheckCircle className="w-3 h-3" />;
            case 'draft': return <FileText className="w-3 h-3" />;
            default: return <FileText className="w-3 h-3" />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Függőben';
            case 'confirmed': return 'Visszaigazolva';
            case 'shipped': return 'Szállítjuk';
            case 'completed': return 'Teljesítve';
            case 'draft': return 'Piszkozat';
            default: return status;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Rendelések Kezelése</h1>
                    <p className="text-gray-500">Összes beérkező megrendelés áttekintése.</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex gap-2 p-1 bg-gray-50 rounded-xl overflow-x-auto">
                    {[
                        { id: 'all', label: 'Összes' },
                        { id: 'pending', label: 'Függőben' },
                        { id: 'confirmed', label: 'Visszaigazolva' },
                        { id: 'shipped', label: 'Szállítás alatt' },
                        { id: 'completed', label: 'Teljesítve' },
                        { id: 'draft', label: 'Piszkozat' }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${filter === f.id
                                ? 'bg-white text-sempermed-text shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Keresés cégnév, ID..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-1 focus:ring-sempermed-green"
                    />
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                            <th className="px-6 py-4 font-semibold">Rendelés #</th>
                            <th className="px-6 py-4 font-semibold">Partner</th>
                            <th className="px-6 py-4 font-semibold">Dátum</th>
                            <th className="px-6 py-4 font-semibold">Státusz</th>
                            <th className="px-6 py-4 text-right font-semibold">Összeg</th>
                            <th className="px-6 py-4 text-center font-semibold">Művelet</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr><td colSpan={7} className="text-center py-8 text-gray-400">Betöltés...</td></tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nincs találat.</td></tr>
                        ) : (
                            filteredOrders.map(order => (
                                <tr
                                    key={order.id}
                                    className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                                    onClick={() => setSelectedOrder(order)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{order.order_number || order.id.slice(0, 8)}</div>
                                        <div className="text-xs text-gray-400">{order.order_items?.[0]?.count || order.orders_items_count || order.order_items?.length || 0} tétel</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-lg font-bold text-gray-900">{order.profiles?.company_name || 'Ismeretlen'}</div>
                                        <div className="text-xs text-sempermed-green font-medium">{order.profiles?.email}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(order.created_at).toLocaleDateString('hu-HU')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusBadge(order.status)}`}>
                                            {getStatusIcon(order.status)}
                                            {getStatusLabel(order.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                                        {order.total_amount?.toLocaleString()} Ft
                                    </td>
                                    <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                        <select
                                            value={order.status}
                                            onChange={(e) => updateStatus(order.id, e.target.value)}
                                            className="text-sm bg-white border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-sempermed-green outline-none cursor-pointer"
                                        >
                                            <option value="pending">Függőben</option>
                                            <option value="confirmed">Visszaigazolva</option>
                                            <option value="shipped">Szállítjuk</option>
                                            <option value="completed">Teljesítve</option>
                                            <option value="draft">Piszkozat</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 group-hover:text-sempermed-green">
                                        <ChevronRight size={20} />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Admin Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
                    <div
                        className="bg-white w-full max-w-4xl rounded-[20px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Rendelés Részletei</h3>
                                <div className="text-gray-500 mt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                    <span className="font-mono">#{selectedOrder.order_number || selectedOrder.id}</span>
                                    <span className="hidden sm:inline">•</span>
                                    <span className="font-medium text-sempermed-green">{selectedOrder.profiles?.company_name}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content Scrollable */}
                        <div className="p-8 overflow-y-auto">
                            {/* Shipping Details */}
                            {selectedOrder.shipping_address && (
                                <div className="mb-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <Truck size={18} className="text-gray-500" />
                                        Szállítási Adatok
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                        <div>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Telephely / Átvevő</span>
                                            <span className="font-bold text-gray-900 text-lg leading-tight block">{selectedOrder.shipping_address.site_name}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Cím</span>
                                            <span className="font-medium text-gray-700 block">{selectedOrder.shipping_address.address}</span>
                                        </div>
                                        {selectedOrder.shipping_address.contact_name && (
                                            <div className="col-span-1 md:col-span-2 border-t border-gray-200 pt-3 mt-1">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Kapcsolattartó</span>
                                                <span className="font-medium text-gray-900 block">{selectedOrder.shipping_address.contact_name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Status Control Panel */}
                            <div className="mb-8 bg-blue-50/50 border border-blue-100 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <div className="text-sm font-bold text-blue-900 uppercase tracking-wide mb-1">Jelenlegi Státusz</div>
                                    <div className="flex items-center gap-3">
                                        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide ${getStatusBadge(selectedOrder.status)}`}>
                                            {getStatusIcon(selectedOrder.status)}
                                            {getStatusLabel(selectedOrder.status)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-gray-600">Státusz módosítása:</span>
                                    <select
                                        value={selectedOrder.status}
                                        onChange={(e) => updateStatus(selectedOrder.id, e.target.value)}
                                        className="bg-white border border-gray-200 rounded-xl px-4 py-2 font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                    >
                                        <option value="pending">Függőben</option>
                                        <option value="confirmed">Visszaigazolva</option>
                                        <option value="shipped">Szállítjuk</option>
                                        <option value="completed">Teljesítve</option>
                                        <option value="draft">Piszkozat</option>
                                    </select>
                                </div>
                            </div>

                            {/* Items Table */}
                            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText size={20} className="text-sempermed-green" />
                                Rendelt Tételek
                            </h4>
                            <table className="w-full mb-8">
                                <thead>
                                    <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                        <th className="pb-3 font-semibold">Termék</th>
                                        <th className="pb-3 font-semibold text-center">SKU</th>
                                        <th className="pb-3 font-semibold text-center">Méret</th>
                                        <th className="pb-3 font-semibold text-center">Mennyiség</th>
                                        <th className="pb-3 font-semibold text-right">Egységár</th>
                                        <th className="pb-3 font-semibold text-right">Összesen</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {selectedOrder.order_items?.map((item: any) => (
                                        <tr key={item.id}>
                                            <td className="py-4 pr-4">
                                                <div className="font-bold text-gray-900">{item.product_name}</div>
                                            </td>
                                            <td className="py-4 text-center text-sm font-mono text-gray-500">{item.products?.sku || '-'}</td>
                                            <td className="py-4 text-center text-sm font-medium text-gray-600">{item.size}</td>
                                            <td className="py-4 text-center text-sm font-bold text-gray-900 bg-gray-50 rounded-lg">{item.quantity} db</td>
                                            <td className="py-4 text-right text-sm text-gray-600">{item.unit_price?.toLocaleString()} Ft</td>
                                            <td className="py-4 text-right font-bold text-gray-900">{(item.unit_price * item.quantity).toLocaleString()} Ft</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Financials */}
                            <div className="flex justify-end border-t border-gray-100 pt-6">
                                <div className="w-72 space-y-3">
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>Részösszeg (Nettó):</span>
                                        <span>{selectedOrder.total_amount?.toLocaleString()} Ft</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-500 border-b border-gray-200 pb-3">
                                        <span>ÁFA (27%):</span>
                                        <span>{(selectedOrder.total_amount * 0.27).toLocaleString()} Ft</span>
                                    </div>
                                    <div className="flex justify-between text-xl font-bold text-sempermed-green pt-1">
                                        <span>Végösszeg (Bruttó):</span>
                                        <span>{(selectedOrder.total_amount * 1.27).toLocaleString()} Ft</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                            <div className="text-xs text-gray-400">
                                Rendelés azonosító: <span className="font-mono">{selectedOrder.id}</span>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => exportToExcel(selectedOrder)}
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-bold shadow-sm"
                                >
                                    <FileSpreadsheet size={18} />
                                    Exportálás (Excel)
                                </button>
                                <button
                                    onClick={() => exportToPDF(selectedOrder)}
                                    className="flex items-center gap-2 px-4 py-2 bg-sempermed-green text-white rounded-lg hover:bg-sempermed-green-dark transition-colors text-sm font-bold shadow-lg shadow-sempermed-green/20"
                                >
                                    <FileText size={18} />
                                    Számla Generálása
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

