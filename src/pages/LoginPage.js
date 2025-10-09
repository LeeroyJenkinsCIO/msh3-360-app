import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
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
        
        // Navigate based on role
        if (userData.role === 'admin') {
          navigate('/admin');
        } else if (userData.role === 'supervisor') {
          navigate('/is-os');
        } else if (userData.role === 'isl' || userData.role === 'isf') {
          navigate('/projects');
        } else {
          navigate('/dashboard');
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
        setUser({
          uid: user.uid,
          email: user.email,
          ...userData
        });
        
        // Navigate based on role
        if (userData.role === 'admin') {
          navigate('/admin');
        } else if (userData.role === 'supervisor') {
          navigate('/is-os');
        } else if (userData.role === 'isl' || userData.role === 'isf' || userData.role === 'ise') {
          navigate('/is-os');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError('User profile not found in Firestore. Run createAuthUsers.js script.');
      }
    } catch (err) {
      console.error('Dev login error:', err);
      setError(`Dev login failed: ${err.message}`);
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

          {/* Development Quick Login Card */}
          <Card borderColor="admin">
            <p className="text-sm font-medium text-neutral-dark text-center mb-4">
              Development Quick Login
            </p>
            
            <div className="space-y-3">
              <Button
                variant="danger"
                onClick={() => devLogin('admin@sierranevada.com')}
                disabled={loading}
                className="w-full"
              >
                Admin Login
              </Button>
              
              <Button
                variant="primary"
                onClick={() => devLogin('ise@sierranevada.com')}
                disabled={loading}
                className="w-full"
              >
                ISE Login
              </Button>
              
              <Button
                variant="isl"
                onClick={() => devLogin('isl@sierranevada.com')}
                disabled={loading}
                className="w-full"
              >
                ISL Login
              </Button>

              <Button
                variant="primary"
                onClick={() => devLogin('supervisor@sierranevada.com')}
                disabled={loading}
                className="w-full bg-msh-purple hover:bg-purple-700"
              >
                Supervisor Login
              </Button>
              
              <Button
                variant="isf"
                onClick={() => devLogin('isf@sierranevada.com')}
                disabled={loading}
                className="w-full"
              >
                ISF Login
              </Button>
              
              <Button
                variant="competencies"
                onClick={() => devLogin('projectlead@sierranevada.com')}
                disabled={loading}
                className="w-full"
              >
                Project Lead Login
              </Button>
            </div>
          </Card>

        </div>
        {/* End White Container Box */}

      </div>
    </div>
  );
}