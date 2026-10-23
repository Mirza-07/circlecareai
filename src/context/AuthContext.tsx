import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, Family, FamilyRole } from '../types/index.js';
import { CircleCareAPI } from '../lib/api.js';

interface AuthContextType {
  user: UserProfile | null;
  family: Family | null;
  role: FamilyRole;
  token: string | null;
  loading: boolean;
  error: string | null;
  switchUser: (uid: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [role, setRole] = useState<FamilyRole>('viewer');
  const [token, setToken] = useState<string | null>(localStorage.getItem('circlecare_token') || 'demo-token-user-sarah-1');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await CircleCareAPI.getMe();
      setUser(data.user);
      setFamily(data.family);
      setRole(data.role);
    } catch (err: any) {
      console.warn('Could not load session:', err.message);
      // Fallback switch to Sarah default
      try {
        const switchRes = await CircleCareAPI.switchUser('user-sarah-1');
        setUser(switchRes.user);
        setFamily(switchRes.family);
        setRole(switchRes.role);
        setToken(switchRes.token);
      } catch (e: any) {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const switchUser = async (uid: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await CircleCareAPI.switchUser(uid);
      setUser(data.user);
      setFamily(data.family);
      setRole(data.role);
      setToken(data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await CircleCareAPI.login(email, password);
      setUser(data.user);
      setToken(data.token);
      await refreshSession();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await CircleCareAPI.register(email, password, displayName);
      setUser(data.user);
      setFamily(data.family);
      setToken(data.token);
      await refreshSession();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('circlecare_token');
    setUser(null);
    setFamily(null);
    setRole('viewer');
    setToken(null);
  };

  const updateProfile = async (patch: Partial<UserProfile>) => {
    const updated = await CircleCareAPI.updateProfile(patch);
    setUser(updated);
  };

  const deleteAccount = async () => {
    await CircleCareAPI.deleteAccount();
    logout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        family,
        role,
        token,
        loading,
        error,
        switchUser,
        login,
        register,
        logout,
        updateProfile,
        deleteAccount,
        refreshSession
      }}
    >
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
