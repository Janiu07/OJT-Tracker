import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getAuthErrorMessage } from '../utils/auth';

const Login = ({ onSwitchToRegister }) => {
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 px-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="rounded-xl shadow-2xl p-8 w-full max-w-md modal-content" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <h2 className="text-3xl font-bold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>Login to OJT Tracker</h2>
        {error && (
          <div className="border text-red-700 px-4 py-3 rounded mb-4" role="alert" aria-live="polite" style={{ backgroundColor: '#70129c', borderColor: '#fca5a5', color: '#dc2626' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              aria-describedby="email-error"
              className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
            />
          </div>
          <div>
            <label htmlFor="password" className="block font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                aria-describedby="password-error"
                className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-medium"
                style={{ color: 'var(--text-accent)' }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition duration-200 disabled:opacity-50"
            aria-describedby="login-status"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div className="flex justify-between items-center mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <button
            type="button"
            className="font-medium underline"
            style={{ color: 'var(--text-accent)' }}
            onClick={() => setError('Forgot password is not available yet. Please contact the admin to reset your password.')}
          >
            Forgot password?
          </button>
          <span></span>
        </div>
        <div className="text-center mt-6" style={{ color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="font-semibold underline"
            style={{ color: 'var(--text-accent)' }}
          >
            Register here
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
