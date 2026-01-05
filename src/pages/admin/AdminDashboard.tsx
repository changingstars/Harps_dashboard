import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { TrendingUp, Users, ShoppingBag, Clock, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalOrders: 0,
        pendingOrders: 0,
        totalRevenue: 0,
        completedOrders: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [topCustomers, setTopCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);

        // 1. Fetch all non-draft orders with user company info
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                id,
                total_amount,
                status,
                created_at,
                user_id,
                profiles (company_name, email)
            `)
            .neq('status', 'draft')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching dashboard data:', error);
            setLoading(false);
            return;
        }

        if (orders) {
            // --- KPI Calculations ---
            const totalOrders = orders.length;
            const pendingOrders = orders.filter(o => o.status === 'pending').length;
            const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'shipped').length;
            const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

            setStats({
                totalOrders,
                pendingOrders,
                totalRevenue,
                completedOrders
            });

            // --- Chart Data Preparation (Group by Date) ---
            const dataByDate: Record<string, number> = {};
            orders.forEach(order => {
                const date = new Date(order.created_at).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
                dataByDate[date] = (dataByDate[date] || 0) + (order.total_amount || 0);
            });

            const chartDataArray = Object.keys(dataByDate).map(date => ({
                name: date,
                revenue: dataByDate[date]
            }));
            setChartData(chartDataArray);

            // --- Top Customers Calculation ---
            const customers: Record<string, { name: string, email: string, revenue: number, count: number }> = {};

            orders.forEach((order: any) => {
                const userId = order.user_id;
                // Supabase returns relations as arrays by default
                const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
                const companyName = profile?.company_name || 'Ismeretlen Partner';
                const email = profile?.email || 'N/A';
                const amount = order.total_amount || 0;

                if (!customers[userId]) {
                    customers[userId] = { name: companyName, email, revenue: 0, count: 0 };
                }
                customers[userId].revenue += amount;
                customers[userId].count += 1;
            });

            const topList = Object.values(customers)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5); // Get Top 5

            setTopCustomers(topList);
        }
        setLoading(false);
    };

    if (loading) return (
        <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sempermed-green"></div>
        </div>
    );

    const cards = [
        { label: 'Összes Bevétel', value: `${stats.totalRevenue.toLocaleString()} Ft`, icon: TrendingUp, color: 'text-sempermed-green', bg: 'bg-sempermed-green/10' },
        { label: 'Függő Rendelések', value: stats.pendingOrders, icon: Clock, color: 'text-sempermed-gold', bg: 'bg-sempermed-gold/10' },
        { label: 'Teljesített', value: stats.completedOrders, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Összes Rendelés', value: stats.totalOrders, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Adminisztrátori Pult</h1>
                <p className="text-gray-500 mt-2">Valós idejű áttekintés a webshop teljesítményéről.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                        <div>
                            <p className="text-sm font-medium text-gray-500">{card.label}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                        </div>
                        <div className={`p-4 rounded-2xl ${card.bg} ${card.color}`}>
                            <card.icon size={24} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[30px] shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Bevételi Trendek</h3>
                            <p className="text-sm text-gray-400 mt-1">Az elmúlt időszak forgalmának alakulása</p>
                        </div>
                        <div className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1">
                            <TrendingUp size={14} />
                            Élő adat
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#009A96" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#009A96" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                        tickFormatter={(value) => `${value / 1000}E`}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                                        formatter={(value: any) => [`${Number(value).toLocaleString()} Ft`, 'Bevétel']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#009A96"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <ShoppingBag size={48} className="mb-4 opacity-20" />
                                <p>Nincs megjeleníthető adat.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Customers */}
                <div className="bg-white p-8 rounded-[30px] shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Kiemelt Partnerek</h3>
                    <div className="space-y-6">
                        {topCustomers.length > 0 ? (
                            topCustomers.map((customer, idx) => (
                                <div key={idx} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 line-clamp-1">{customer.name}</div>
                                            <div className="text-xs text-gray-500">{customer.count} rendelés</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-sempermed-green">{customer.revenue.toLocaleString()}</div>
                                        <div className="text-xs text-gray-400">HUF</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <p>Nincs elérhető partner adat.</p>
                            </div>
                        )}
                    </div>

                    {topCustomers.length > 0 && (
                        <button className="w-full mt-8 py-3 rounded-xl border border-gray-100 text-gray-500 text-sm font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                            Összes megtekintése <ArrowUpRight size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
