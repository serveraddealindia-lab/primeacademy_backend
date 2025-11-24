import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);

    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (err.response) {
        errorMessage = err.response.data?.message || err.message || errorMessage;
      } else if (err.request) {
        errorMessage = 'Unable to connect to server. Please check your connection.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* Left Side - Login Form with Background Image */}
      <div 
        className="w-full lg:w-1/2 relative flex items-center justify-center min-h-screen"
        style={{
          backgroundImage: `url('/login-bg.jpeg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-70"></div>
        
        {/* Login Form Container */}
        <div className="relative z-10 w-full max-w-md px-8 py-12">
          {/* Logo Section */}
          <div className="mb-12">
            <div className="mb-4">
              <div className="text-orange-500 text-5xl font-bold tracking-tight mb-2" style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.1' }}>
                PRIME
              </div>
              <div className="flex flex-col mb-2">
                <div className="h-1 w-24 bg-orange-500 mb-1"></div>
                <div className="h-0.5 w-24 bg-orange-500"></div>
              </div>
              <div className="text-white text-xl font-light tracking-wider mb-1">ACADEMY</div>
              <div className="text-gray-400 text-xs mt-1">SINCE 2013</div>
            </div>
            <p className="text-white text-lg font-light">Digital Art With Excellence</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500 bg-opacity-90 text-white rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-30 rounded-lg text-white placeholder-white placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent backdrop-blur-sm"
                placeholder="Enter your email"
                style={{ color: 'white' }}
              />
            </div>

            <div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-30 rounded-lg text-white placeholder-white placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent backdrop-blur-sm"
                placeholder="Enter your password"
                style={{ color: 'white' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white text-opacity-80 text-sm">
              Enter your registered email and password to continue
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Promotional Content */}
      <div className="hidden lg:flex lg:w-1/2 bg-white relative overflow-hidden">
        <div className="w-full h-full p-12 flex flex-col justify-center">
          {/* Top Text */}
          <div className="mb-12">
            <h2 className="text-6xl font-bold text-black leading-tight mb-2">
              A Journey of 12 Years
            </h2>
            <h2 className="text-6xl font-bold text-black leading-tight">
              A Legacy of Pride
            </h2>
          </div>

          {/* Photo Grid - Using login-page.jpeg as background or placeholder */}
          <div className="grid grid-cols-2 gap-6 mt-8">
            <div 
              className="border-4 border-red-600 rounded-lg overflow-hidden bg-gray-200 aspect-square shadow-lg"
              style={{
                backgroundImage: `url('/login-page.jpeg')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="w-full h-full bg-black bg-opacity-20"></div>
            </div>
            <div 
              className="border-4 border-red-600 rounded-lg overflow-hidden bg-gray-200 aspect-square shadow-lg"
              style={{
                backgroundImage: `url('/login-page.jpeg')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="w-full h-full bg-black bg-opacity-20"></div>
            </div>
            <div 
              className="border-4 border-red-600 rounded-lg overflow-hidden bg-gray-200 aspect-square shadow-lg col-span-2"
              style={{
                backgroundImage: `url('/login-page.jpeg')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="w-full h-full bg-black bg-opacity-20"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
