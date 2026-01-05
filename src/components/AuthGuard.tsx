import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import type { Session } from '@supabase/supabase-js'

export default function AuthGuard() {
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setSession(session)

            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single()

                setIsAdmin(profile?.role === 'admin')
            }

            setLoading(false)
        }

        checkUser()

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session)
            // If session changes (e.g. sign in), we might want to re-check role, but Login handles that. 
            // This listener is mostly for sign-out or token refresh.
        })

        return () => subscription.unsubscribe()
    }, [])

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-gray-50 text-sempermed-green">Loading...</div>
    }

    if (!session) {
        return <Navigate to="/login" replace />
    }

    // Auto-redirect admin from root to admin panel to prevent flashing
    if (isAdmin && window.location.pathname === '/') {
        return <Navigate to="/admin" replace />
    }

    return <Outlet />
}
