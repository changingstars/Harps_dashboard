import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminGuard() {
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    useEffect(() => {
        const checkRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setIsAdmin(false);
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            setIsAdmin(profile?.role === 'admin');
        };
        checkRole();
    }, []);

    if (isAdmin === null) return <div className="p-8 text-center text-gray-500">Jogosultságok ellenőrzése...</div>;

    return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}
