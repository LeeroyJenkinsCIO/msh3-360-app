import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import Logo from '../components/Logo';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        onLogin({
          uid: user.uid,
          email: user.email,
          ...userData
        });
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

  const devLogin = async (devEmail) => {
    setEmail(devEmail);
    setPassword('password123');
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, devEmail, 'password123');
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        onLogin({
          uid: user.uid,
          email: user.email,
          ...userData
        });
      }
    } catch (err) {
      setError('Dev login failed');
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Main Container Top Bar */}
        <div className="h-2 bg-gray-700"></div>
        
        <div className="p-8 space-y-8">
          {/* Header Section */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="large" showTagline={true} />
            </div>
            <p className="text-sm text-gray-600">Outcome Assessment Tool</p>
          </div>

          {/* Primary Login Card */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <div className="h-2 bg-blue-600"></div>
            <div className="p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="you@sierranevada.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                </div>

                <button
                  onClick={handleLogin}
                  disabled={loading || !email || !password}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </div>
            </div>
          </div>

          {/* Development Quick Login Card */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <div className="h-2 bg-purple-600"></div>
            <div className="p-6">
              <p className="text-sm font-medium text-gray-700 text-center mb-4">Development Quick Login</p>
              <div className="space-y-3">
                <button
                  onClick={() => devLogin('admin@sierranevada.com')}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Admin Login
                </button>
                <button
                  onClick={() => devLogin('robert.paddock@sierranevada.com')}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Robert Paddock (ISL)
                </button>
                <button
                  onClick={() => devLogin('paul.gill@sierranevada.com')}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Paul Gill (Team Member)
                </button>
              </div>
              <p className="mt-4 text-center text-sm text-gray-500">
                All passwords: password123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}