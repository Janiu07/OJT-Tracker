import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { getAuthErrorMessage } from '../utils/auth';

const Register = ({ onSwitchToLogin }) => {
  const { register } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    requiredHours: 500
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await register(
        formData.name,
        formData.email,
        formData.password,
        formData.requiredHours
      );

      if (response.requiresVerification) {
        setVerificationEmail(response.user?.email || formData.email);
        setShowVerificationModal(true);
        setSuccessMessage(response.message || 'Please verify your email before logging in.');
      } else {
        setSuccessMessage(response.message || 'Registration successful.');
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setVerificationError('');
    setVerificationSuccess('');

    if (!verificationCode.trim()) {
      setVerificationError('Please enter the verification code sent to your email.');
      return;
    }

    setVerificationLoading(true);

    try {
      const response = await axios.post('/api/auth/verify-email', {
        email: verificationEmail,
        code: verificationCode.trim()
      });

      setVerificationSuccess(response.data.message || 'Email verified successfully.');
      setTimeout(() => {
        setShowVerificationModal(false);
        setVerificationCode('');
        setVerificationSuccess('');
      }, 1200);
    } catch (err) {
      setVerificationError(err.response?.data?.message || 'Unable to verify your email.');
    } finally {
      setVerificationLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 px-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="rounded-xl shadow-2xl p-8 w-full max-w-md modal-content" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <h2 className="text-3xl font-bold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>Register for OJT Tracker</h2>
        {error && (
          <div className="border text-red-700 px-4 py-3 rounded mb-4" style={{ backgroundColor: '#fee2e2', borderColor: '#fca5a5', color: '#dc2626' }}>
            {error}
          </div>
        )}
        {successMessage && (
          <div className="border text-green-700 px-4 py-3 rounded mb-4" style={{ backgroundColor: '#dcfce7', borderColor: '#86efac', color: '#15803d' }}>
            {successMessage}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
            />
          </div>
          <div>
            <label className="block font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
            />
          </div>
          <div>
            <label className="block font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
            />
          </div>
          <div>
            <label className="block font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
            />
          </div>
          <div>
            <label className="block font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Required OJT Hours</label>
            <input
              type="number"
              name="requiredHours"
              value={formData.requiredHours}
              onChange={handleChange}
              min="1"
              required
              className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <div className="text-center mt-6" style={{ color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <button 
            onClick={onSwitchToLogin}
            className="font-semibold underline"
            style={{ color: 'var(--text-accent)' }}
          >
            Login here
          </button>
        </div>
      </div>

      {showVerificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border p-6 shadow-2xl" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
            <h3 className="text-xl font-semibold mb-2">Verify your email</h3>
            <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              We sent a 6-digit verification code to <span className="font-medium">{verificationEmail}</span>.
            </p>
            {verificationError && (
              <div className="mb-3 rounded border px-3 py-2 text-sm text-red-700" style={{ backgroundColor: '#fee2e2', borderColor: '#fca5a5' }}>
                {verificationError}
              </div>
            )}
            {verificationSuccess && (
              <div className="mb-3 rounded border px-3 py-2 text-sm text-green-700" style={{ backgroundColor: '#dcfce7', borderColor: '#86efac' }}>
                {verificationSuccess}
              </div>
            )}
            <form onSubmit={handleVerificationSubmit} className="space-y-3">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
              />
              <button
                type="submit"
                disabled={verificationLoading}
                className="w-full rounded-lg bg-blue-500 px-4 py-3 font-semibold text-white transition duration-200 disabled:opacity-50"
              >
                {verificationLoading ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setShowVerificationModal(false)}
              className="mt-3 text-sm font-medium underline"
              style={{ color: 'var(--text-accent)' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
