'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { 
  signInWithEmailLink, 
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  email: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sendSignInLink: (email: string) => Promise<void>;
  completeSignIn: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Email storage key - used to remember which email we're verifying
const EMAIL_STORAGE_KEY = 'chanceshs_auth_email';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setEmail(currentUser?.email || null);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Check for email link sign-in on mount
  useEffect(() => {
    const checkEmailLink = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let storedEmail = window.localStorage.getItem(EMAIL_STORAGE_KEY);
        
        if (!storedEmail) {
          // If email not in storage, prompt user (shouldn't happen in normal flow)
          storedEmail = window.prompt('Please provide your email for confirmation') || '';
        }

        if (storedEmail) {
          try {
            setIsLoading(true);
            await signInWithEmailLink(auth, storedEmail, window.location.href);
            window.localStorage.removeItem(EMAIL_STORAGE_KEY);
            // Clear the URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (error) {
            console.error('Error signing in with email link:', error);
            alert('Invalid or expired login link. Please try again.');
          } finally {
            setIsLoading(false);
          }
        }
      }
    };

    checkEmailLink();
  }, []);

  // Send sign-in link to email
  const sendSignInLink = async (emailToSend: string) => {
    const actionCodeSettings = {
      // URL must be whitelisted in Firebase Console
      url: `${window.location.origin}/calculator`,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, emailToSend, actionCodeSettings);
      window.localStorage.setItem(EMAIL_STORAGE_KEY, emailToSend);
    } catch (error) {
      console.error('Error sending sign-in link:', error);
      throw error;
    }
  };

  // Complete sign-in (used when we already have the email)
  const completeSignIn = async (emailToComplete: string) => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      try {
        setIsLoading(true);
        await signInWithEmailLink(auth, emailToComplete, window.location.href);
        window.localStorage.removeItem(EMAIL_STORAGE_KEY);
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('Error completing sign-in:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
      window.localStorage.removeItem(EMAIL_STORAGE_KEY);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        email,
        isLoading,
        isAuthenticated: !!user,
        sendSignInLink,
        completeSignIn,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper function to get user identifier (email or fallback)
export function getUserIdentifier(email: string | null): string {
  if (email) {
    // Create a consistent identifier from email
    return email.toLowerCase().trim();
  }
  // Fallback to localStorage for backward compatibility during transition
  if (typeof window !== 'undefined') {
    const legacyId = window.localStorage.getItem('chanceshs_user_id');
    if (legacyId) return legacyId;
  }
  return '';
}
