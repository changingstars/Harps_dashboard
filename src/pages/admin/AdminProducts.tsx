import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Edit2, Package, X } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    base_price: number;
    sku: string;
    category: string;
    image_url: string;
    specs?: any;
}

export default function AdminProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form states
    const [formData, setFormData] = useState<Partial<Product>>({});

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        const { data } = await supabase
            .from('products')
            .select('*')
            .order('name');

        if (data) setProducts(data);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData(product);
    };

    const handleSave = async () => {
        if (!editingProduct || !formData) return;

        const { error } = await supabase
            .from('products')
            .update(formData)
            .eq('id', editingProduct.id);

        if (error) {
            alert('Hiba a mentés során: ' + error.message);
        } else {
            setEditingProduct(null);
            fetchProducts();
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Termékek Kezelése</h1>
                    <p className="text-gray-500">Termékadatok és árak módosítása.</p>
                </div>
            </div>

            <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                            <th className="px-6 py-4 font-semibold">Termék</th>
                            <th className="px-6 py-4 font-semibold">Cikkszám (SKU)</th>
                            <th className="px-6 py-4 font-semibold">Kategória</th>
                            <th className="px-6 py-4 text-right font-semibold">Ár (Nettó)</th>
                            <th className="px-6 py-4 text-center font-semibold">Művelet</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {products.map(product => (
                            <tr key={product.id} className="hover:bg-gray-50/80 transition-colors group">
                                <td className="px-6 py-4 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden p-1 flex items-center justify-center">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                                        ) : <Package size={20} className="text-gray-400" />}
                                    </div>
                                    <span className="font-medium text-gray-900">{product.name}</span>
                                </td>
                                <td className="px-6 py-4 text-gray-500 font-mono text-sm">{product.sku}</td>
                                <td className="px-6 py-4">
                                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-lg uppercase">
                                        {product.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-gray-900">
                                    {product.base_price?.toLocaleString()} Ft
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => handleEdit(product)}
                                        className="p-2 hover:bg-sempermed-green/10 text-gray-400 hover:text-sempermed-green rounded-lg transition-colors"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editingProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-[20px] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold">Termék szerkesztése</h3>
                            <button onClick={() => setEditingProduct(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Termék neve</label>
                                <input
                                    type="text"
                                    className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-1 focus:ring-sempermed-green"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Cikkszám</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-1 focus:ring-sempermed-green"
                                        value={formData.sku || ''}
                                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nettó Ár (HUF)</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-1 focus:ring-sempermed-green"
                                        value={formData.base_price || 0}
                                        onChange={e => setFormData({ ...formData, base_price: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Kép URL</label>
                                <input
                                    type="text"
                                    className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-1 focus:ring-sempermed-green text-sm"
                                    value={formData.image_url || ''}
                                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                            <button
                                onClick={() => setEditingProduct(null)}
                                className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-colors"
                            >
                                Mégse
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-5 py-2.5 rounded-xl font-bold bg-sempermed-green text-white shadow-lg shadow-sempermed-green/20 hover:scale-105 transition-transform"
                            >
                                Mentés
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
