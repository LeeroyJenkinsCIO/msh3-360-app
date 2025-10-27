// 📁 SAVE TO: src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, setPersistence, browserSessionPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import { Card, Button } from '../components/ui';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 🔒 SECURITY: ALWAYS use session-only persistence
      // Session clears when browser closes (both dev and prod)
      await setPersistence(auth, browserSessionPersistence);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUser({
          uid: user.uid,
          email: user.email,
          ...userData
        });
        
        // ✅ Smart role-based navigation after login
        const isAdmin = userData.flags?.isAdmin || userData.role === 'admin';
        const isHRP = userData.role?.toLowerCase() === 'hrp' || 
                      userData.flags?.isHRP || 
                      userData.layer?.toLowerCase() === 'hrp';
        
        if (isAdmin) {
          navigate('/admin');
        } else if (isHRP) {
          navigate('/isos-org');
        } else {
          navigate('/is-os');  // Default to ISOS Hub for ISE/ISL/ISF
        }
      } else {
        setError('User profile not found. Please contact administrator.');
        await auth.signOut();
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (err.code === 'auth/wrong-password') {
        setError('Invalid password');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const adminLogin = async () => {
    // Development only - remove in production
    if (process.env.NODE_ENV !== 'development') {
      console.warn('Admin login disabled in production');
      return;
    }
    
    setEmail('admin@sierranevada.com');
    setPassword('password');
    setError('');
    setLoading(true);

    try {
      // 🔒 SECURITY: Session-only persistence for admin too
      await setPersistence(auth, browserSessionPersistence);
      
      const userCredential = await signInWithEmailAndPassword(auth, 'admin@sierranevada.com', 'password');
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUser({
          uid: user.uid,
          email: user.email,
          ...userData
        });
        
        // ✅ Admin quick login goes directly to Admin page
        navigate('/admin');
      } else {
        setError('Admin profile not found. Please run seedFirebase.js script.');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('Admin user not found. Please run seedFirebase.js script.');
      } else {
        setError(`Admin login failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && email && password && !loading) {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-neutral-light flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* White Container Box */}
        <div className="bg-white rounded-card shadow-card-hover p-6 space-y-6 border-t-card-top border-t-msh-indigo">
          
          {/* Header Card - Blends into container */}
          <Card className="text-center shadow-none">
            <div className="flex justify-center mb-4">
              <Logo size="large" showTagline={true} />
            </div>
            <p className="text-base font-semibold text-neutral-dark">
              <span className="text-culture">Culture</span>
              {' | '}
              <span className="text-competencies">Competency</span>
              {' | '}
              <span className="text-execution">Execution</span>
            </p>
          </Card>

          {/* Primary Login Card */}
          <Card borderColor="msh-blue" className="-mt-5">
            {error && (
              <div className="mb-6 p-4 bg-danger-light border border-danger rounded-lg">
                <p className="text-sm text-danger-dark">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-dark mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-4 py-3 border border-neutral-light rounded-lg focus:ring-2 focus:ring-msh-blue focus:border-transparent"
                  placeholder="you@sierranevada.com"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-dark mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-4 py-3 border border-neutral-light rounded-lg focus:ring-2 focus:ring-msh-blue focus:border-transparent"
                  placeholder="Enter your password"
                  disabled={loading}
                />
              </div>

              <Button
                variant="primary"
                onClick={handleLogin}
                disabled={loading || !email || !password}
                className="w-full"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>
          </Card>

          {/* Development Quick Login Card - Only show in development */}
          {process.env.NODE_ENV === 'development' && (
            <Card borderColor="admin">
              <p className="text-sm font-medium text-neutral-dark text-center mb-4">
                Development Quick Login
              </p>
              
              <Button
                variant="danger"
                onClick={adminLogin}
                disabled={loading}
                className="w-full"
              >
                Admin Login
              </Button>
              
              <p className="text-xs text-neutral text-center mt-3">
                All users: <span className="font-mono">password</span>
              </p>
            </Card>
          )}

          {/* Security Notice - Show in production */}
          {process.env.NODE_ENV === 'production' && (
            <div className="text-center text-xs text-gray-500">
              <p>🔒 Secure session - You'll be logged out when you close your browser</p>
            </div>
          )}

        </div>
        {/* End White Container Box */}

      </div>
    </div>
  );
}