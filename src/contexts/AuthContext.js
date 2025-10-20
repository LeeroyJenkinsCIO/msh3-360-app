// 📁 SAVE TO: src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getUserPermissions } from '../utils/permissions';

// Create the context
const AuthContext = createContext(null);

/**
 * Maps database user structure to app-compatible role
 * Database has: layer (ISE/ISL/ISF/ADMIN), flags, pillarRole
 * App expects: role (for navigation and permissions)
 */
function mapUserRole(userData) {
  // Admin user
  if (userData.flags?.isAdmin) {
    return 'admin';
  }
  
  // Map layer to role for navigation
  switch (userData.layer) {
    case 'ISE':
      return 'ise';
    case 'ISL':
      return 'isl';
    case 'ISF':
      // Further differentiate ISF by pillarRole
      if (userData.pillarRole === 'supervisor') {
        return 'supervisor';
      }
      return 'isf';
    case 'ADMIN':
      return 'admin';
    default:
      return 'isf'; // Default fallback
  }
}

/**
 * AuthProvider Component
 * Manages authentication state and user permissions
 * 
 * Provides:
 * - user: Current user object with role and metadata
 * - permissions: User's permission object
 * - setUser: Function to update user state
 * - logout: Function to log out
 * - loading: Loading state
 * - isAuthenticated: Boolean authentication status
 * 
 * 🔒 SECURITY FEATURES:
 * - Inactivity timeout (30min prod, 2hr dev)
 * - Auto-logout on timeout
 * - Session tracking
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeoutWarning, setTimeoutWarning] = useState(false);
  
  // 🔒 SECURITY: Inactivity timeout configuration
  const INACTIVITY_TIMEOUT = process.env.NODE_ENV === 'production' 
    ? 30 * 60 * 1000  // 30 minutes in production
    : 2 * 60 * 60 * 1000; // 2 hours in development
  
  const WARNING_BEFORE_TIMEOUT = 2 * 60 * 1000; // 2 minutes warning
  
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);

  // 🔒 SECURITY: Logout function
  const logout = useCallback(async (reason = 'manual') => {
    try {
      // Clear timers
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      
      await signOut(auth);
      setUser(null);
      setTimeoutWarning(false);
      
      // Log reason for audit
      console.log(`User logged out: ${reason}`);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  }, []);

  // 🔒 SECURITY: Reset inactivity timer on user activity
  const resetInactivityTimer = useCallback(() => {
    // Only reset if user is authenticated
    if (!user) return;
    
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    
    // Clear warning if it was showing
    setTimeoutWarning(false);
    
    // Set warning timer (shows 2 minutes before logout)
    warningTimeoutRef.current = setTimeout(() => {
      setTimeoutWarning(true);
      console.log('⚠️ Inactivity warning: 2 minutes until auto-logout');
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE_TIMEOUT);
    
    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      console.log('🔒 Auto-logout due to inactivity');
      logout('inactivity');
    }, INACTIVITY_TIMEOUT);
  }, [user, INACTIVITY_TIMEOUT, WARNING_BEFORE_TIMEOUT, logout]);

  // 🔒 SECURITY: Track user activity
  useEffect(() => {
    if (!user) return;

    // Activity events to track
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Throttle activity tracking to avoid excessive resets
    let lastActivity = Date.now();
    const THROTTLE_DELAY = 1000; // 1 second

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity > THROTTLE_DELAY) {
        lastActivity = now;
        resetInactivityTimer();
      }
    };

    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, [user, resetInactivityTimer]);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch user data from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Map database structure to app-compatible user object
            const mappedUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...userData,
              // Add computed role for navigation/permissions
              role: mapUserRole(userData),
              // Use displayName if available, fallback to email
              name: userData.displayName || firebaseUser.displayName || firebaseUser.email
            };
            
            setUser(mappedUser);
          } else {
            // User exists in Auth but not in Firestore
            console.warn('User found in Auth but not in Firestore:', firebaseUser.uid);
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'isf', // Default role
              name: firebaseUser.displayName || firebaseUser.email,
              layer: 'ISF',
              flags: {}
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Set minimal user on error
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: 'isf', // Default role on error
            name: firebaseUser.displayName || firebaseUser.email,
            layer: 'ISF',
            flags: {}
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Get permissions for current user
  const permissions = user ? getUserPermissions(user) : null;

  const value = {
    user,
    setUser,
    logout,
    permissions,
    loading,
    isAuthenticated: !!user,
    timeoutWarning,
    resetInactivityTimer
  };

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-light">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary-dark mb-4">
            MSH³
          </div>
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div className="text-sm text-neutral mt-4">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      
      {/* 🔒 SECURITY: Inactivity Warning Toast */}
      {timeoutWarning && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-900 mb-1">
                  Inactivity Warning
                </h3>
                <p className="text-xs text-yellow-800 mb-3">
                  You'll be logged out in 2 minutes due to inactivity. Move your mouse or press a key to stay logged in.
                </p>
                <button
                  onClick={resetInactivityTimer}
                  className="text-xs font-semibold text-yellow-900 bg-yellow-200 hover:bg-yellow-300 px-3 py-1.5 rounded transition-colors"
                >
                  Stay Logged In
                </button>
              </div>
              <button
                onClick={() => setTimeoutWarning(false)}
                className="flex-shrink-0 text-yellow-600 hover:text-yellow-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use auth context
 * Must be used within AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;