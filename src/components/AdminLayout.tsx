import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Package, LogOut, Menu, X, HelpCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { SempermedLogo } from './SempermedLogo';

export default function AdminLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const [email, setEmail] = useState<string>('');

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setEmail(user.email || '');
        };
        getUser();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const navItems = [
        { path: '/admin', icon: LayoutDashboard, label: 'Áttekintés' },
        { path: '/admin/orders', icon: ShoppingBag, label: 'Rendelések' },
        { path: '/admin/products', icon: Package, label: 'Termékek' },
        { path: '/admin/support', icon: HelpCircle, label: 'Támogatás' },
    ];

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-sempermed-text overflow-hidden">
            {/* Sidebar */}
            <aside
                className={`${isSidebarOpen ? 'w-64' : 'w-20'
                    } bg-white shadow-xl flex flex-col transition-all duration-300 z-20 absolute md:relative h-full`}
            >
                <div className="p-6 flex items-center justify-between">
                    {isSidebarOpen ? (
                        <SempermedLogo className="h-8" />
                    ) : (
                        <div className="w-8 h-8 bg-sempermed-green rounded-full mx-auto" />
                    )}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 md:hidden"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-sempermed-green text-white shadow-md shadow-sempermed-green/20'
                                    : 'text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                <Icon size={24} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-sempermed-green'} />
                                <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <div className={`flex items-center gap-3 px-4 py-3 ${!isSidebarOpen && 'justify-center'}`}>
                        <div className="w-8 h-8 rounded-full bg-sempermed-gold/20 flex items-center justify-center text-sempermed-gold font-bold text-xs shrink-0">
                            A
                        </div>
                        {isSidebarOpen && (
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold text-gray-900 truncate">Adminisztrátor</p>
                                <p className="text-xs text-gray-500 truncate">{email}</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-4 py-3 mt-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors ${!isSidebarOpen && 'justify-center'}`}
                    >
                        <LogOut size={20} />
                        {isSidebarOpen && <span className="font-medium">Kilépés</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Mobile Header */}
                <header className="md:hidden bg-white p-4 shadow-sm flex items-center justify-between z-10">
                    <SempermedLogo className="h-6" />
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        <Menu size={24} className="text-gray-500" />
                    </button>
                </header>

                <div className="flex-1 overflow-auto p-4 md:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
