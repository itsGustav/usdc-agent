'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthChange, signIn as firebaseSignIn, signUp as firebaseSignUp, signOut as firebaseSignOut, resetPassword } from '@/lib/firebase-client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const user = await firebaseSignIn(email, password);
    return user;
  };

  const signUp = async (email: string, password: string) => {
    const user = await firebaseSignUp(email, password);
    return user;
  };

  const handleSignOut = async () => {
    await firebaseSignOut();
  };

  const handleResetPassword = async (email: string) => {
    await resetPassword(email);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signOut: handleSignOut,
      resetPassword: handleResetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
