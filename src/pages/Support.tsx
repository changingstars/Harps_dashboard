import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, MessageSquare, X, Send } from 'lucide-react';

interface Ticket {
    id: string;
    subject: string;
    message: string;
    status: string;
    created_at: string;
}

export default function Support() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTicket, setNewTicket] = useState({ subject: '', message: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching tickets:', error);
            } else {
                setTickets(data || []);
            }
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('support_tickets')
            .insert({
                user_id: user.id,
                subject: newTicket.subject,
                message: newTicket.message,
                status: 'open'
            });

        if (error) {
            alert('Hiba történt a hibajegy létrehozása során.');
            console.error(error);
        } else {
            // Trigger Email to Admin
            supabase.functions.invoke('send-email', {
                body: {
                    type: 'new_ticket',
                    data: {
                        user_email: user.email,
                        company_name: 'Ismeretlen', // Ideally fetch profile, or handle in Edge Func
                        subject: newTicket.subject,
                        message: newTicket.message
                    }
                }
            }).then(({ error }) => {
                if (error) console.error('Error sending email:', error);
            });

            setNewTicket({ subject: '', message: '' });
            setIsModalOpen(false);
            fetchTickets();
        }
        setSubmitting(false);
    };

    const getStatusStyle = (status: string) => {
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
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Támogatás</h1>
                    <p className="text-gray-500 mt-2">Itt tudsz segítséget kérni vagy hibát bejelenteni.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-sempermed-green text-white px-6 py-3 rounded-xl font-bold hover:bg-sempermed-green-dark transition-all shadow-lg shadow-sempermed-green/20 hover:shadow-xl hover:-translate-y-0.5"
                >
                    <Plus size={20} />
                    Új hibajegy
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden min-h-[400px] flex flex-col">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="font-bold text-gray-900 text-lg">Korábbi jegyeim</h2>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400">Betöltés...</div>
                ) : tickets.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 text-gray-300">
                            <MessageSquare size={32} />
                        </div>
                        <h3 className="text-gray-900 font-medium mb-1">Még nincs hibajegyed</h3>
                        <p className="text-gray-400 text-sm">Még nem hoztál létre hibajegyet.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {tickets.map(ticket => (
                            <div key={ticket.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-900 text-lg">{ticket.subject}</h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusStyle(ticket.status)}`}>
                                        {getStatusLabel(ticket.status)}
                                    </span>
                                </div>
                                <p className="text-gray-600 mb-4 line-clamp-2">{ticket.message}</p>
                                <div className="text-xs text-gray-400 font-medium">
                                    Létrehozva: {new Date(ticket.created_at).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Ticket Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                    <div
                        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Új hibajegy létrehozása</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tárgy</label>
                                <input
                                    type="text"
                                    required
                                    value={newTicket.subject}
                                    onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-sempermed-green outline-none font-medium"
                                    placeholder="pl. Hiba a rendelésnél"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Üzenet</label>
                                <textarea
                                    required
                                    rows={5}
                                    value={newTicket.message}
                                    onChange={e => setNewTicket({ ...newTicket, message: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-sempermed-green outline-none font-medium resize-none"
                                    placeholder="Írd le részletesen a tapasztalt problémát..."
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-sempermed-green text-white py-3 rounded-xl font-bold hover:bg-sempermed-green-dark transition-colors flex items-center justify-center gap-2 mt-2"
                            >
                                {submitting ? 'Küldés...' : (
                                    <>
                                        <Send size={18} />
                                        Hibajegy Beküldése
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
