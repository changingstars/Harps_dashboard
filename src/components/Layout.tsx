import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { LogOut, Package, ShoppingCart, User, HelpCircle, Briefcase, ArrowLeft } from 'lucide-react'
import { SempermedLogo } from './SempermedLogo'

export default function Layout() {
    const navigate = useNavigate()
    const location = useLocation()

    const [missingDetails, setMissingDetails] = useState<string[]>([])

    useEffect(() => {
        const checkProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase.from('profiles').select('company_name').eq('id', user.id).single()
            const { count } = await supabase.from('delivery_addresses').select('*', { count: 'exact', head: true }).eq('user_id', user.id)

            const missing = []
            if (!profile?.company_name) missing.push('Cégnév')
            if ((count || 0) === 0) missing.push('Szállítási Cím')

            setMissingDetails(missing)
        }
        // Check on mount and route change, unless on account page (where they are fixing it)
        if (location.pathname !== '/account' && location.pathname !== '/login') {
            checkProfile()
        } else {
            // Optional: keep it or clear it. Clearing avoids distraction while fixing.
            setMissingDetails([])
        }
    }, [location.pathname])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        navigate('/login')
    }

    const navItems = [
        { path: '/', label: 'Saját fiókom', icon: User },
        { path: '/products', label: 'Termékek', icon: Package },
        { path: '/orders', label: 'Rendeléseim', icon: ShoppingCart },
        { path: '/account', label: 'Fiók Beállítások', icon: Briefcase },
        { path: '/support', label: 'Támogatás', icon: HelpCircle },
    ]

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex font-sans text-sempermed-text">
            {/* Sidebar - Updated to Sempermed Dark or Clean White? 
                Assets suggest a white header structure, but preserving sidebar layout 
                with Sempermed styling (Dark text on white or Dark background).
                Trying a Clean White Sidebar with Green Accents to match the "Medical/Clean" feel */}
            <aside className="w-[300px] bg-white border-r border-gray-100 flex flex-col fixed h-full z-10 transition-all duration-300 shadow-sm">
                <div className="p-8 pb-4">
                    <SempermedLogo className="h-10 mb-2" />
                    <span className="text-xs text-sempermed-gold uppercase tracking-wider font-bold block ml-1">PARTNER PORTÁL</span>
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto mt-4">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.path
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center space-x-4 px-6 py-4 rounded-full transition-all duration-200 group ${isActive
                                    ? 'bg-sempermed-green/10 text-sempermed-green font-bold'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-sempermed-green-dark font-medium'
                                    }`}
                            >
                                <Icon size={22} className={`transition-colors ${isActive ? "text-sempermed-green" : "text-gray-400 group-hover:text-sempermed-green-dark"}`} />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 mt-auto">
                    <button
                        className="flex items-center space-x-4 px-6 py-4 w-full text-gray-400 hover:text-sempermed-green-dark transition-colors rounded-full hover:bg-gray-50"
                    >
                        <ArrowLeft size={22} />
                        <span className="font-medium">Vissza a főoldalra</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-4 px-6 py-4 w-full text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors rounded-full mt-2"
                    >
                        <LogOut size={22} />
                        <span className="font-medium">Kijelentkezés</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-[300px] p-12 relative">
                {missingDetails.length > 0 && location.pathname !== '/account' && (
                    <div className="mb-8 bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg flex items-center justify-between animate-in slide-in-from-top-2 shadow-sm border-y border-r border-orange-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white rounded-full text-orange-500 shadow-sm border border-orange-100">
                                <Briefcase size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-orange-900 text-lg">Hiányzó Adatok</h3>
                                <p className="text-orange-700">A rendelés leadásához kérjük pótolja a következő adatokat: <span className="font-bold underline Decoration-orange-300">{missingDetails.join(', ')}</span></p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/account')}
                            className="px-6 py-3 bg-white text-orange-600 font-bold rounded-xl border border-orange-200 hover:bg-orange-50 transition-colors text-sm shadow-sm flex items-center gap-2"
                        >
                            Adatok Megadása
                            <ArrowLeft size={16} className="rotate-180" />
                        </button>
                    </div>
                )}
                <Outlet />
            </main>
        </div>
    )
}
