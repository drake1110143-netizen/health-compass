import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppUser, UserRole } from '@/types/medical';

interface SessionContextType {
  currentUser: AppUser | null;
  isLoading: boolean;
  login: (fullName: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const SESSION_KEY = 'medicore_session';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (fullName: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const trimmedName = fullName.trim();
      if (!trimmedName) return { success: false, error: 'Full name is required' };

      // Check if patient is trying to log in without being registered by a doctor
      if (role === 'patient') {
        const { data: patientProfile } = await supabase
          .from('patient_profiles')
          .select('id, patient_id')
          .ilike('full_name', trimmedName)
          .single();

        if (!patientProfile) {
          return { 
            success: false, 
            error: 'No patient record found. Please ask your doctor to register you first.' 
          };
        }
      }

      // Find or create user
      const { data: existingUser, error: fetchError } = await supabase
        .from('app_users')
        .select('*')
        .eq('full_name', trimmedName)
        .eq('role', role)
        .single();

      let user: AppUser;

      if (existingUser && !fetchError) {
        // Update last login
        const { data: updated } = await supabase
          .from('app_users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', existingUser.id)
          .select()
          .single();
        user = { ...(updated || existingUser), role: (updated || existingUser).role as UserRole };

        // Link patient user to profile if needed
        if (role === 'patient') {
          await supabase
            .from('patient_profiles')
            .update({ app_user_id: user.id })
            .ilike('full_name', trimmedName)
            .is('app_user_id', null);
        }
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabase
          .from('app_users')
          .insert({ full_name: trimmedName, role, last_login: new Date().toISOString() })
          .select()
          .single();

        if (createError || !newUser) {
          return { success: false, error: createError?.message || 'Failed to create user' };
        }
        user = { ...newUser, role: newUser.role as UserRole };

        // Link patient to profile
        if (role === 'patient') {
          await supabase
            .from('patient_profiles')
            .update({ app_user_id: user.id })
            .ilike('full_name', trimmedName);
        }
      }

      setCurrentUser(user as AppUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <SessionContext.Provider value={{ currentUser, isLoading, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
