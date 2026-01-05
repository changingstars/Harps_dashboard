import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Building2, FileText } from 'lucide-react'
import { SempermedLogo } from '../components/SempermedLogo'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [companyName, setCompanyName] = useState('')
    const [taxId, setTaxId] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()

    const [isSignUp, setIsSignUp] = useState(false)

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (isSignUp) {
            if (!companyName || !taxId) {
                setError('Kérjük töltsön ki minden mezőt!')
                setLoading(false)
                return
            }

            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        company_name: companyName,
                        tax_id: taxId,
                        role: 'customer' // Default role
                    }
                }
            })
            if (error) setError(error.message)
            else {
                setError('Ellenőrizd az email fiókodat!')
            }
        } else {
            const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            if (signInError) {
                setError(signInError.message)
            } else if (user) {
                // Check role for cleaner redirect
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (profile?.role === 'admin') {
                    navigate('/admin')
                } else {
                    navigate('/')
                }
            }
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 font-sans text-sempermed-text">
            <div className="w-full max-w-lg bg-white p-10 rounded-[30px] shadow-lg shadow-black/5">
                <div className="flex justify-center mb-6">
                    <SempermedLogo className="h-12" />
                </div>
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-sempermed-text tracking-tight mb-2">
                        {isSignUp ? 'Regisztráció' : 'Bejelentkezés'}
                    </h1>
                    <p className="text-gray-500">
                        {isSignUp ? 'Hozd létre céges fiókodat.' : 'Üdvözlünk újra! Kérjük, add meg az adataidat.'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6">
                    {error && (
                        <div className={`p-4 rounded-xl text-sm border font-medium ${error.includes('Ellenőrizd') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                            {error}
                        </div>
                    )}

                    {isSignUp && (
                        <>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">Cégnév</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                        <Building2 size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Az Ön Cége Kft."
                                        className="block w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 text-gray-900 placeholder-gray-300 focus:border-sempermed-green focus:ring-1 focus:ring-sempermed-green outline-none transition-colors"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">Adószám</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                        <FileText size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        placeholder="12345678-1-23"
                                        className="block w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 text-gray-900 placeholder-gray-300 focus:border-sempermed-green focus:ring-1 focus:ring-sempermed-green outline-none transition-colors"
                                        value={taxId}
                                        onChange={(e) => setTaxId(e.target.value)}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Email cím</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                <Mail size={20} />
                            </div>
                            <input
                                type="email"
                                required
                                placeholder="pelda@email.hu"
                                className="block w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 text-gray-900 placeholder-gray-300 focus:border-sempermed-green focus:ring-1 focus:ring-sempermed-green outline-none transition-colors"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Jelszó</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                <Lock size={20} />
                            </div>
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                className="block w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 text-gray-900 placeholder-gray-300 focus:border-sempermed-green focus:ring-1 focus:ring-sempermed-green outline-none transition-colors"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {!isSignUp && (
                        <div className="flex justify-start">
                            <button type="button" className="text-sempermed-green hover:text-sempermed-green-dark text-sm font-semibold transition-colors">
                                Elfelejtetted a jelszavad?
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center group"
                    >
                        {loading ? 'Folyamatban...' : (
                            <>
                                {isSignUp ? 'Regisztráció' : 'Belépés'}
                                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-gray-500 text-sm">
                        {isSignUp ? 'Már van fiókod? ' : 'Még nincs fiókod? '}
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-sempermed-green font-bold hover:underline focus:outline-none"
                        >
                            {isSignUp ? 'Jelentkezz be' : 'Regisztrálj ingyen'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    )
}
