import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Edit2, Package, X, Plus, Trash2, Save, Loader2, Image as ImageIcon, FileSpreadsheet, Download, Upload } from 'lucide-react';
import { read, utils, writeFile } from 'xlsx';

interface Product {
    id: string;
    name: string;
    base_price: number;
    sku: string;
    category: string;
    image_url: string;
    specifications: Record<string, string>; // JSONB in DB
    variants: { size: string }[]; // JSONB in DB
}

export default function AdminProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form states
    const [formData, setFormData] = useState<Partial<Product>>({});

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('products')
            .select('*')
            .order('name');

        if (data) setProducts(data);
        setLoading(false);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            ...product,
            specifications: product.specifications || {},
            variants: product.variants || []
        });
    };

    const handleCreate = () => {
        setEditingProduct({ id: 'new' } as Product);
        setFormData({
            name: '',
            sku: '',
            category: '',
            base_price: 0,
            image_url: '',
            specifications: {
                packaging_unit: 'par',
                items_per_dispenser: '50',
                dispensers_per_carton: '6'
            },
            variants: []
        });
    }

    const handleSave = async () => {
        if (!editingProduct || !formData) return;
        setSaving(true);

        const productData = {
            name: formData.name,
            sku: formData.sku,
            base_price: formData.base_price,
            category: formData.category,
            image_url: formData.image_url,
            specifications: formData.specifications,
            variants: formData.variants
        };

        let error;

        if (editingProduct.id === 'new') {
            const { error: insertError } = await supabase
                .from('products')
                .insert(productData);
            error = insertError;
        } else {
            const { error: updateError } = await supabase
                .from('products')
                .update(productData)
                .eq('id', editingProduct.id);
            error = updateError;
        }

        if (error) {
            alert('Hiba a mentés során: ' + error.message);
        } else {
            setEditingProduct(null);
            fetchProducts();
        }
        setSaving(false);
    };

    // --- Excel Handlers ---

    const handleExportTemplate = () => {
        const template = [
            {
                name: "Példa Kesztyű",
                sku: "SKU-SAMPLE",
                category: "Vizsgálókesztyű",
                base_price: 1500,
                image_url: "https://example.com/image.png",
                unit: "db",
                items_per_dispenser: 100,
                dispensers_per_carton: 10,
                specifications: '{"Anyag": "Nitril", "Szín": "Kék"}',
                variants: "S, M, L, XL"
            },
            {
                name: "Példa Sebészi",
                sku: "SKU-SURG",
                category: "Sebészi Kesztyű",
                base_price: 4200,
                image_url: "https://example.com/image.png",
                unit: "par",
                items_per_dispenser: 50,
                dispensers_per_carton: 6,
                specifications: '{"Anyag": "Latex", "Szín": "Natúr"}',
                variants: "6.0, 6.5, 7.0, 7.5, 8.0"
            }
        ];

        const ws = utils.json_to_sheet(template);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Template");
        writeFile(wb, "termek_import_sablon.xlsx");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = utils.sheet_to_json(ws);

                setLoading(true);
                let successCount = 0;
                let errorCount = 0;

                for (const row of data as any[]) {
                    try {
                        // Parse Specs
                        let specifications: Record<string, any> = {};

                        // Parse JSON specs first
                        if (row.specifications) {
                            try {
                                specifications = JSON.parse(row.specifications);
                            } catch {
                                // Fallback: key:value
                                row.specifications.toString().split(',').forEach((curr: string) => {
                                    const [k, v] = curr.split(':');
                                    if (k && v) specifications[k.trim()] = v.trim();
                                });
                            }
                        }

                        // Add packaging info to specifications
                        if (row.unit) specifications.packaging_unit = row.unit;
                        if (row.items_per_dispenser) specifications.items_per_dispenser = String(row.items_per_dispenser);
                        if (row.dispensers_per_carton) specifications.dispensers_per_carton = String(row.dispensers_per_carton);

                        // Parse Variants
                        let variants: { size: string }[] = [];
                        if (row.variants) {
                            variants = row.variants.toString().split(',').map((v: string) => ({ size: v.trim() }));
                        }

                        const productPayload = {
                            name: row.name,
                            sku: row.sku,
                            category: row.category,
                            base_price: Number(row.base_price),
                            image_url: row.image_url,
                            specifications,
                            variants
                        };

                        const { error } = await supabase
                            .from('products')
                            .upsert(productPayload, { onConflict: 'sku' });

                        if (error) throw error;
                        successCount++;

                    } catch (err) {
                        console.error('Error importing row:', row, err);
                        errorCount++;
                    }
                }

                alert(`Importálás kész!\nSikeres: ${successCount}\nHibás: ${errorCount}`);
                fetchProducts();
            } catch (err) {
                alert('Hiba a fájl feldolgozása közben: ' + err);
            } finally {
                setLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };


    // --- Helpers for Specs ---
    const addSpec = () => {
        const newSpecs = { ...formData.specifications, '': '' };
        setFormData({ ...formData, specifications: newSpecs });
    };

    const updateSpecKey = (oldKey: string, newKey: string) => {
        const specs = { ...formData.specifications };
        const value = specs[oldKey];
        delete specs[oldKey];
        specs[newKey] = value;
        setFormData({ ...formData, specifications: specs });
    };

    const updateSpecValue = (key: string, value: string) => {
        setFormData({
            ...formData,
            specifications: { ...formData.specifications, [key]: value }
        });
    };

    const removeSpec = (key: string) => {
        const specs = { ...formData.specifications };
        delete specs[key];
        setFormData({ ...formData, specifications: specs });
    };

    // --- Helpers for Variants ---
    const addVariant = () => {
        const currentVariants = formData.variants || [];
        setFormData({
            ...formData,
            variants: [...currentVariants, { size: '' }]
        });
    };

    const updateVariantSize = (index: number, size: string) => {
        const currentVariants = [...(formData.variants || [])];
        currentVariants[index] = { ...currentVariants[index], size };
        setFormData({ ...formData, variants: currentVariants });
    };

    const removeVariant = (index: number) => {
        const currentVariants = [...(formData.variants || [])];
        currentVariants.splice(index, 1);
        setFormData({ ...formData, variants: currentVariants });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Termékek Kezelése</h1>
                    <p className="text-gray-500">Termékadatok, specifikációk és árak teljes körű módosítása.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportTemplate}
                        className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                        <FileSpreadsheet size={16} />
                        Sablon
                        <Download size={14} className="text-gray-400" />
                    </button>
                    <div className="relative">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            ref={fileInputRef}
                        />
                        <button className="px-4 py-2 text-sm font-bold text-sempermed-green bg-sempermed-green/10 border border-transparent rounded-xl hover:bg-sempermed-green/20 transition-colors flex items-center gap-2">
                            <Upload size={16} />
                            Importálás
                        </button>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2 text-sm font-bold text-white bg-sempermed-green rounded-xl hover:bg-sempermed-green-dark transition-colors flex items-center gap-2 shadow-lg shadow-sempermed-green/20"
                    >
                        <Plus size={16} />
                        Új termék
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center text-gray-400">
                        <Loader2 className="animate-spin" size={32} />
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Termék</th>
                                <th className="px-6 py-4 font-semibold">SKU / Kat.</th>
                                <th className="px-6 py-4 font-semibold">Változatok</th>
                                <th className="px-6 py-4 text-right font-semibold">Ár (Diszpenzer)</th>
                                <th className="px-6 py-4 text-center font-semibold">Művelet</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {products.map(product => (
                                <tr key={product.id} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="px-6 py-4 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden p-1 flex items-center justify-center border border-gray-100">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                                            ) : <Package size={20} className="text-gray-400" />}
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-900 block">{product.name}</span>
                                            <div className="text-xs text-gray-400 flex flex-col gap-0.5">
                                                <span>{Object.keys(product.specifications || {}).length} specifikáció</span>
                                                {product.specifications?.packaging_unit && (
                                                    <span className="text-sempermed-green font-medium">
                                                        {product.specifications.items_per_dispenser} {product.specifications.packaging_unit}/doboz • {product.specifications.dispensers_per_carton} doboz/karton
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 font-mono text-xs">{product.sku}</span>
                                            <span className="text-xs font-bold uppercase text-sempermed-green mt-1">
                                                {product.category}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {(product.variants || []).map((v: any, i) => (
                                                <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                                    {v.size}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                                        {product.base_price?.toLocaleString()} Ft
                                        <div className="text-[10px] text-gray-400 font-normal">per diszpenzer</div>
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
                )}
            </div>

            {/* Edit Modal / Slide-over */}
            {editingProduct && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white z-10">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Termék szerkesztése</h3>
                                <p className="text-xs text-gray-500 font-mono mt-1">{editingProduct.id}</p>
                            </div>
                            <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">

                            {/* Alapadatok */}
                            <section>
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">Alapadatok</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Termék neve</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.name || ''}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cikkszám (SKU)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.sku || ''}
                                            onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Kategória</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.category || ''}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Diszpenzer Ár (Nettó HUF)</label>
                                        <input
                                            type="number"
                                            className="form-input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            value={formData.base_price || 0}
                                            onChange={e => setFormData({ ...formData, base_price: Number(e.target.value) })}
                                        />
                                        <p className="text-xs text-gray-400 mt-1">1 db doboz (diszpenzer) ára.</p>
                                    </div>
                                </div>
                            </section>

                            {/* Csomagolás (Packaging) */}
                            <section>
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">Csomagolás és Kiszerelés</h4>
                                <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Egység Típus</label>
                                        <select
                                            className="form-input"
                                            value={formData.specifications?.packaging_unit || 'par'}
                                            onChange={e => updateSpecValue('packaging_unit', e.target.value)}
                                        >
                                            <option value="db">Darab (db)</option>
                                            <option value="par">Pár (pár)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Menny. / Diszpenzer</label>
                                        <input
                                            type="number"
                                            className="form-input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            value={formData.specifications?.items_per_dispenser || ''}
                                            onChange={e => updateSpecValue('items_per_dispenser', e.target.value)}
                                            placeholder="pl. 100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Diszp. / Karton</label>
                                        <input
                                            type="number"
                                            className="form-input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            value={formData.specifications?.dispensers_per_carton || ''}
                                            onChange={e => updateSpecValue('dispensers_per_carton', e.target.value)}
                                            placeholder="pl. 10"
                                        />
                                    </div>
                                    <div className="col-span-3 pt-2 text-xs text-gray-500 flex gap-4">
                                        <span>
                                            <strong>Egységár:</strong> {formData.base_price && formData.specifications?.items_per_dispenser ?
                                                Math.round(formData.base_price / Number(formData.specifications.items_per_dispenser)) + ' Ft / ' + (formData.specifications.packaging_unit === 'db' ? 'db' : 'pár')
                                                : '-'}
                                        </span>
                                        <span>
                                            <strong>Karton Ár:</strong> {formData.base_price && formData.specifications?.dispensers_per_carton ?
                                                (formData.base_price * Number(formData.specifications.dispensers_per_carton)).toLocaleString() + ' Ft'
                                                : '-'}
                                        </span>
                                    </div>
                                </div>
                            </section>

                            {/* Kép */}
                            <section>
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">Termékkép</h4>
                                <div className="flex gap-6 items-start">
                                    <div className="w-32 h-32 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center relative overflow-hidden group">
                                        {formData.image_url ? (
                                            <img src={formData.image_url} alt="Preview" className="w-full h-full object-contain" />
                                        ) : (
                                            <ImageIcon className="text-gray-300" size={32} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Kép URL</label>
                                        <input
                                            type="text"
                                            className="form-input w-full"
                                            value={formData.image_url || ''}
                                            onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                            placeholder="https://..."
                                        />
                                        <p className="text-xs text-gray-400 mt-2">A kép automatikusan frissül az előnézetben.</p>
                                    </div>
                                </div>
                            </section>

                            {/* Változatok (Méretek) */}
                            <section>
                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Méretek / Változatok</h4>
                                    <button onClick={addVariant} className="text-xs font-bold text-sempermed-green hover:underline flex items-center gap-1">
                                        <Plus size={14} /> Méret hozzáadása
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(formData.variants || []).map((variant, idx) => (
                                        <div key={idx} className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
                                            <input
                                                type="text"
                                                className="bg-transparent border-none text-sm font-bold text-center w-12 p-1 focus:ring-0"
                                                value={variant.size}
                                                onChange={e => updateVariantSize(idx, e.target.value)}
                                                placeholder="S"
                                            />
                                            <button onClick={() => removeVariant(idx)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {(formData.variants?.length === 0) && (
                                        <p className="text-sm text-gray-400 italic">Nincsenek méretek megadva.</p>
                                    )}
                                </div>
                            </section>

                            {/* Specifikációk */}
                            <section>
                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Egyéb Specifikációk</h4>
                                    <button onClick={addSpec} className="text-xs font-bold text-sempermed-green hover:underline flex items-center gap-1">
                                        <Plus size={14} /> Adat hozzáadása
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {Object.entries(formData.specifications || {})
                                        .filter(([key]) => !['packaging_unit', 'items_per_dispenser', 'dispensers_per_carton'].includes(key))
                                        .map(([key, value], idx) => (
                                            <div key={idx} className="flex gap-3 items-start">
                                                <input
                                                    type="text"
                                                    className="form-input flex-1 !text-gray-500 !text-xs !font-bold uppercase"
                                                    value={key}
                                                    onChange={e => updateSpecKey(key, e.target.value)}
                                                    placeholder="TULAJDONSÁG (PL. ANYAG)"
                                                />
                                                <input
                                                    type="text"
                                                    className="form-input flex-[2]"
                                                    value={value}
                                                    onChange={e => updateSpecValue(key, e.target.value)}
                                                    placeholder="Érték (pl. Nitril)"
                                                />
                                                <button
                                                    onClick={() => removeSpec(key)}
                                                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    {Object.keys(formData.specifications || {}).filter(k => !['packaging_unit', 'items_per_dispenser', 'dispensers_per_carton'].includes(k)).length === 0 && (
                                        <p className="text-sm text-gray-400 italic">Nincsenek egyéb specifikációk rögzítve.</p>
                                    )}
                                </div>
                            </section>

                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 z-10">
                            <button
                                onClick={() => setEditingProduct(null)}
                                className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-colors"
                            >
                                Mégse
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-5 py-2.5 rounded-xl font-bold bg-sempermed-green text-white shadow-lg shadow-sempermed-green/20 hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50 disabled:scale-100"
                            >
                                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Mentés
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .form-input {
                    width: 100%;
                    padding: 0.75rem; /* p-3 */
                    background-color: rgb(249 250 251); /* bg-gray-50 */
                    border-radius: 0.75rem; /* rounded-xl */
                    border: 1px solid transparent;
                    transition: all 0.2s;
                }
                .form-input:focus {
                    background-color: white;
                    border-color: #009E91; /* sempered-green */
                    outline: none;
                    box-shadow: 0 0 0 4px rgba(0, 158, 145, 0.05);
                }
            `}</style>
        </div>
    );
}
