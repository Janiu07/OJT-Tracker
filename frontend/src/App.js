import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import ThemeToggle from './components/ThemeToggle';

const AppContent = () => {
  const { user, logout, loading } = useContext(AuthContext);
  const [showLogin, setShowLogin] = useState(true);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [verificationError, setVerificationError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await axios.get(`/api/auth/verify-email?token=${token}`);
        setVerificationMessage(response.data.message || 'Email verified successfully. You can now log in.');
      } catch (error) {
        setVerificationError(error.response?.data?.message || 'Unable to verify your email.');
      }
    };

    verifyEmail();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Loading...</h2>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {(verificationMessage || verificationError) && (
          <div className={`mx-auto mt-6 max-w-md rounded-lg border px-4 py-3 text-sm ${verificationError ? 'text-red-700 border-red-300 bg-red-50' : 'text-green-700 border-green-300 bg-green-50'}`}>
            {verificationError || verificationMessage}
          </div>
        )}
        {showLogin ? (
          <Login onSwitchToRegister={() => setShowLogin(false)} />
        ) : (
          <Register onSwitchToLogin={() => setShowLogin(true)} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <nav style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} className="shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>OJT Tracker</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-300 hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>Hello, {user.name}</span>
              <ThemeToggle />
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 px-3 sm:px-4 py-2 rounded-lg font-medium transition duration-200 text-sm sm:text-base text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <Dashboard />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
