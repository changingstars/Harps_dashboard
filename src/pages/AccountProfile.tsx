import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, MapPin, Building, Save, Plus, Trash2, AlertCircle } from 'lucide-react';

export default function AccountProfile() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [newAddress, setNewAddress] = useState({ site_name: '', address: '', contact_name: '', is_default: false });
    const [isAddingAddress, setIsAddingAddress] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchProfileAndAddresses();
    }, []);

    const fetchProfileAndAddresses = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch Profile
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        // Fetch Addresses
        const { data: addressData } = await supabase
            .from('delivery_addresses')
            .select('*')
            .eq('user_id', user.id)
            .order('is_default', { ascending: false });

        setProfile(profileData);
        setAddresses(addressData || []);
        setLoading(false);
    };

    const updateProfile = async () => {
        setSaving(true);
        const { error } = await supabase
            .from('profiles')
            .update({
                company_name: profile.company_name,
                tax_id: profile.tax_id
            })
            .eq('id', profile.id);

        if (error) {
            setMessage({ type: 'error', text: 'Hiba a mentés során: ' + error.message });
        } else {
            setMessage({ type: 'success', text: 'Cégadatok sikeresen frissítve!' });
            setTimeout(() => setMessage(null), 3000);
        }
        setSaving(false);
    };

    const addAddress = async () => {
        if (!newAddress.site_name || !newAddress.address) {
            setMessage({ type: 'error', text: 'A telephely neve és címe kötelező!' });
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const payload = { ...newAddress, user_id: user.id };

        const { error } = await supabase
            .from('delivery_addresses')
            .insert(payload);

        if (error) {
            setMessage({ type: 'error', text: 'Hiba a hozzáadáskor: ' + error.message });
        } else {
            setNewAddress({ site_name: '', address: '', contact_name: '', is_default: false });
            setIsAddingAddress(false);
            fetchProfileAndAddresses();
            setMessage({ type: 'success', text: 'Telephely sikeresen hozzáadva!' });
        }
    };

    const deleteAddress = async (id: string) => {
        if (!confirm('Biztosan törölni szeretné ezt a címet?')) return;

        const { error } = await supabase.from('delivery_addresses').delete().eq('id', id);
        if (error) {
            setMessage({ type: 'error', text: 'Hiba a törléskor.' });
        } else {
            fetchProfileAndAddresses();
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Betöltés...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Fiók Beállítások</h1>
                <p className="text-gray-500 mt-2">Kérjük, tartsa naprakészen cégadatait és szállítási címeit.</p>
            </header>

            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    <AlertCircle size={20} />
                    {message.text}
                </div>
            )}

            {/* Company Info Section */}
            <div className="bg-white rounded-[30px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Building size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Cégadatok</h2>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Cégnév</label>
                        <input
                            type="text"
                            value={profile?.company_name || ''}
                            onChange={e => setProfile({ ...profile, company_name: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-sempermed-green outline-none transition-all font-medium"
                            placeholder="Pl. T-Medical Kft."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Adószám</label>
                        <input
                            type="text"
                            value={profile?.tax_id || ''}
                            onChange={e => setProfile({ ...profile, tax_id: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-sempermed-green outline-none transition-all font-medium"
                            placeholder="Pl. 12345678-1-42"
                        />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                        <button
                            onClick={updateProfile}
                            disabled={saving}
                            className="bg-sempermed-green text-white px-6 py-3 rounded-xl font-bold hover:bg-sempermed-green-dark transition-colors flex items-center gap-2 shadow-lg shadow-sempermed-green/20 disabled:opacity-50"
                        >
                            <Save size={18} />
                            {saving ? 'Mentés...' : 'Változások Mentése'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Delivery Addresses Section */}
            <div className="bg-white rounded-[30px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                            <MapPin size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Szállítási Címek (Telephelyek)</h2>
                    </div>
                    <button
                        onClick={() => setIsAddingAddress(!isAddingAddress)}
                        className="text-sempermed-green font-bold text-sm bg-sempermed-green/10 px-4 py-2 rounded-lg hover:bg-sempermed-green/20 transition-colors flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Új Cím
                    </button>
                </div>

                {isAddingAddress && (
                    <div className="p-8 bg-gray-50/50 border-b border-gray-100 animate-in slide-in-from-top-4 duration-300">
                        <h3 className="font-bold text-gray-800 mb-4">Új Telephely Hozzáadása</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder="Telephely neve (pl. Raktár 1)"
                                value={newAddress.site_name}
                                onChange={e => setNewAddress({ ...newAddress, site_name: e.target.value })}
                                className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-sempermed-green outline-none"
                            />
                            <input
                                type="text"
                                placeholder="Kapcsolattartó (Opcionális)"
                                value={newAddress.contact_name}
                                onChange={e => setNewAddress({ ...newAddress, contact_name: e.target.value })}
                                className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-sempermed-green outline-none"
                            />
                            <div className="md:col-span-2">
                                <input
                                    type="text"
                                    placeholder="Pontos cím (Irsz, Város, Utca, Házszám)"
                                    value={newAddress.address}
                                    onChange={e => setNewAddress({ ...newAddress, address: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-sempermed-green outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setIsAddingAddress(false)} className="px-4 py-2 text-gray-500 font-medium hover:bg-gray-200 rounded-lg transition-colors">Mégse</button>
                            <button onClick={addAddress} className="bg-sempermed-green text-white px-6 py-2 rounded-lg font-bold hover:bg-sempermed-green-dark transition-colors">Hozzáadás</button>
                        </div>
                    </div>
                )}

                <div className="divide-y divide-gray-50">
                    {addresses.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            Még nincs rögzített szállítási cím.
                        </div>
                    ) : (
                        addresses.map(addr => (
                            <div key={addr.id} className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-gray-900">{addr.site_name}</h4>
                                        {addr.is_default && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Alapértelmezett</span>}
                                    </div>
                                    <p className="text-gray-600">{addr.address}</p>
                                    {addr.contact_name && <p className="text-sm text-gray-400 mt-1 flex items-center gap-1"><User size={14} /> {addr.contact_name}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => deleteAddress(addr.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
