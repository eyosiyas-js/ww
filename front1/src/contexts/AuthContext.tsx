import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authStorage } from '@/lib/auth';
import { loginRequest, mockGet } from '@/api/client';
import { API_BASE_URL } from '@/api/config';

interface User {
    id: string;
    email: string;
    fullName: string;
    role: string;
    organizationId: string;
    organizationLat?: number;
    organizationLng?: number;
    companyType?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: any) => Promise<void>;
    logout: () => void;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const savedUser = authStorage.getUser();
        const token = authStorage.getToken();

        if (savedUser && token) {
            setUser(savedUser); // Optimistic load
            // Fetch fresh permissions to apply immediately on refresh
            mockGet(`${API_BASE_URL}/auth/me`)
                .then((response: any) => {
                    if (response.success && response.data && isMounted) {
                        const freshUser = response.data;
                        setUser(freshUser);
                        authStorage.setUser(freshUser);
                    }
                })
                .catch((e) => console.error("Could not refresh user session", e));
        }
        setIsLoading(false);

        return () => {
            isMounted = false;
        };
    }, []);

    const login = useCallback(async (credentials: any) => {
        try {
            const response = await loginRequest(`${API_BASE_URL}/auth/login`, credentials);
            if (response.success) {
                const { accessToken, user } = response.data;
                authStorage.setToken(accessToken);
                authStorage.setUser(user);
                setUser(user);
                return response.data;
            }
            return null;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }, []);

    const logout = useCallback(() => {
        authStorage.clearAll();
        setUser(null);
    }, []);
    
    const refreshProfile = useCallback(async () => {
        try {
            const response: any = await mockGet(`${API_BASE_URL}/auth/me`);
            if (response.success && response.data) {
                const freshUser = response.data;
                setUser(freshUser);
                authStorage.setUser(freshUser);
            }
        } catch (error) {
            console.error("Manual profile refresh failed", error);
        }
    }, []);

    const value = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};
