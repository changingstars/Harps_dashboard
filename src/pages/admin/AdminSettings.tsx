import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Save, MapPin } from 'lucide-react';

export default function AdminSettings() {
    const [warehouseAddress, setWarehouseAddress] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'warehouse_address')
                .single();

            if (data) {
                setWarehouseAddress(data.value);
            } else if (error && error.code !== 'PGRST116') {
                console.error('Error fetching settings:', error);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({
                    key: 'warehouse_address',
                    value: warehouseAddress,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Beállítások sikeresen mentve.' });

            // Clear success message after 3 seconds
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage({ type: 'error', text: 'Hiba történt a mentés során.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Betöltés...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Beállítások</h2>
                <p className="text-gray-500 mt-1">Rendszer szintű beállítások kezelése</p>
            </div>

            <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-6 max-w-2xl">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <MapPin size={20} className="text-sempermed-gold" />
                    Raktári Átvétel
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Raktár címe
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                            Ez a cím fog megjelenni a partnereknek, amikor a "Raktári felvétel" opciót választják.
                        </p>
                        <input
                            type="text"
                            value={warehouseAddress}
                            onChange={(e) => setWarehouseAddress(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sempermed-gold focus:outline-none transition-all"
                            placeholder="Pl. 1234 Budapest, Raktár u. 1."
                        />
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                        {message && (
                            <div className={`text-sm font-medium ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {message.text}
                            </div>
                        )}
                        {!message && <div></div>} {/* Spacer */}

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn-primary flex items-center gap-2"
                        >
                            {saving ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            Mentés
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
