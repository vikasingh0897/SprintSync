'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// ── Hardcoded admin credentials ────────────────────────────────────────────
const ADMIN_EMAIL    = 'admin@admin.com';
const ADMIN_PASSWORD = 'admin@1234';
const ADMIN_NAME     = 'Admin';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router   = useRouter();
  const pathname = usePathname();

  // Restore session & theme from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('ss_token');
    const storedUser  = localStorage.getItem('ss_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);

    // Restore theme globally
    const savedTheme = localStorage.getItem('ss_theme') ?? 'dark';
    let savedAccent = localStorage.getItem('ss_accent') ?? 'indigo';
    if (savedAccent.startsWith('#')) savedAccent = 'indigo';
    
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (savedTheme === 'system' && prefersDark);
    
    root.classList.remove('dark', 'light', 'theme-indigo', 'theme-violet', 'theme-pink', 'theme-cyan', 'theme-emerald', 'theme-amber');
    root.classList.add(isDark ? 'dark' : 'light', `theme-${savedAccent}`);
  }, []);

  // Route protection
  useEffect(() => {
    if (!isLoading) {
      const isAuthPage = pathname === '/login' || pathname === '/signup';
      if (!token && !isAuthPage) router.push('/login');
      else if (token && isAuthPage) router.push('/');
    }
  }, [token, isLoading, pathname, router]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (email.trim().toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return { success: false, error: 'Invalid email or password. Please try again.' };
    }

    const adminUser: User = { id: 'admin-001', email: ADMIN_EMAIL, name: ADMIN_NAME };
    const dummyToken = `ss_token_admin_${Date.now()}`;

    localStorage.setItem('ss_token', dummyToken);
    localStorage.setItem('ss_user', JSON.stringify(adminUser));
    setToken(dummyToken);
    setUser(adminUser);
    router.push('/');
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem('ss_token');
    localStorage.removeItem('ss_user');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
