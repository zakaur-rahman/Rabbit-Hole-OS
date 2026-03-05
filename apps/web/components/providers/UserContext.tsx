'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiFetch } from '@/lib/api';

interface UserProfile {
    name?: string;
    email: string;
    avatar_url?: string;
    plan?: string;
}

interface UserContextType {
    user: UserProfile | null;
    isLoading: boolean;
    error: string | null;
    reload: () => void;
}

const UserContext = createContext<UserContextType>({
    user: null,
    isLoading: true,
    error: null,
    reload: () => { },
});

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadUser = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await apiFetch('/oauth/me');
            if (!res.ok) throw new Error('Failed to load user profile');
            const data = await res.json();
            setUser(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUser();
    }, []);

    return (
        <UserContext.Provider value={{ user, isLoading, error, reload: loadUser }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    return useContext(UserContext);
}
