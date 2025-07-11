import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useUser } from './UserContext';

interface AuthContextType {
    accessToken: string | null;
    isAuthenticated: boolean;
    login: (accessToken: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const { updateUserFromToken, clearUser } = useUser();

    useEffect(() => {
        if (accessToken) {
            updateUserFromToken(accessToken);
        } else {
            clearUser();
        }
    }, [accessToken, updateUserFromToken, clearUser]);

    const login = useCallback((token: string) => {
        setAccessToken(token);
    }, []);

    const logout = useCallback(() => {
        setAccessToken(null);
    }, []);

    const contextValue = useMemo(() => ({
        accessToken,
        isAuthenticated: !!accessToken,
        login,
        logout
    }), [accessToken, login, logout]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
