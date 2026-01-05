import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { MessageSquare, Search, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Ticket {
    id: string;
    subject: string;
    message: string;
    status: string;
    created_at: string;
    profiles: {
        company_name: string;
        email: string;
    }
}

export default function AdminSupport() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('support_tickets')
            .select(`
                *,
                profiles:user_id (company_name, email)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tickets:', error);
        } else {
            setTickets(data || []);
        }
        setLoading(false);
    };

    const updateStatus = async (id: string, newStatus: string) => {
        const { error } = await supabase
            .from('support_tickets')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            alert('Hiba történt a státusz frissítésekor.');
        } else {
            fetchTickets();
        }
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesFilter = filter === 'all' || ticket.status === filter;
        const matchesSearch =
            ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.profiles?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open': return 'bg-yellow-100 text-yellow-800';
            case 'closed': return 'bg-gray-100 text-gray-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'open': return 'Nyitott';
            case 'closed': return 'Lezárt';
            case 'resolved': return 'Megoldva';
            default: return status;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Támogatás & Hibajegyek</h1>
                <p className="text-gray-500">Partnerek által beküldött visszajelzések kezelése.</p>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex gap-2 p-1 bg-gray-50 rounded-xl">
                    {['all', 'open', 'resolved', 'closed'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f
                                ? 'bg-white text-sempermed-green shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {f === 'all' ? 'Összes' :
                                f === 'open' ? 'Nyitott' :
                                    f === 'resolved' ? 'Megoldva' : 'Lezárt'}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Keresés..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-1 focus:ring-sempermed-green"
                    />
                </div>
            </div>

            {/* Ticket List */}
            <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                            <th className="px-6 py-4 font-semibold">Partner</th>
                            <th className="px-6 py-4 font-semibold">Tárgy / Üzenet</th>
                            <th className="px-6 py-4 font-semibold">Státusz</th>
                            <th className="px-6 py-4 font-semibold">Dátum</th>
                            <th className="px-6 py-4 font-semibold text-right">Művelet</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-400">Betöltés...</td></tr>
                        ) : filteredTickets.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nincs találat.</td></tr>
                        ) : (
                            filteredTickets.map(ticket => (
                                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 align-top">
                                        <div className="font-bold text-gray-900">{ticket.profiles?.company_name || 'Ismeretlen'}</div>
                                        <div className="text-xs text-sempermed-green">{ticket.profiles?.email}</div>
                                    </td>
                                    <td className="px-6 py-4 align-top max-w-md">
                                        <div className="font-bold text-gray-900 mb-1">{ticket.subject}</div>
                                        <p className="text-sm text-gray-500 line-clamp-2">{ticket.message}</p>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusBadge(ticket.status)}`}>
                                            {getStatusLabel(ticket.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 align-top text-sm text-gray-500 whitespace-nowrap">
                                        {new Date(ticket.created_at).toLocaleDateString('hu-HU')}
                                        <div className="text-xs text-gray-400">{new Date(ticket.created_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}</div>
                                    </td>
                                    <td className="px-6 py-4 align-top text-right">
                                        <select
                                            value={ticket.status}
                                            onChange={(e) => updateStatus(ticket.id, e.target.value)}
                                            className="text-sm bg-white border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-sempermed-green outline-none cursor-pointer"
                                        >
                                            <option value="open">Nyitott</option>
                                            <option value="resolved">Megoldva</option>
                                            <option value="closed">Lezárt</option>
                                        </select>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
