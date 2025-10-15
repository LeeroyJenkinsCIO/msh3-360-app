import React, { createContext, useContext, useState, useEffect } from 'react';
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
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Logout function
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  // Get permissions for current user
  const permissions = user ? getUserPermissions(user) : null;

  const value = {
    user,
    setUser,
    logout,
    permissions,
    loading,
    isAuthenticated: !!user,
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