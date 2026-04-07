import React, { useState } from 'react';
import { supabase } from '../services/supabase';

const Login = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check for admin credentials
      if (form.email === 'admin' && form.password === 'admin') {
        const adminUser = { id: 'admin', email: 'admin' };
        if (form.rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('userEmail', 'admin');
        }
        onLogin(adminUser);
        return;
      }

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password
        });
        
        if (error) throw error;
        
        if (data.user) {
          if (data.user.email_confirmed_at) {
            // Email already confirmed, log in directly
            if (form.rememberMe) {
              localStorage.setItem('rememberMe', 'true');
            }
            onLogin(data.user);
          } else {
            // Show success message for email confirmation
            setError('Account created! Please check your email to verify your account, then sign in.');
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        });
        
        if (error) throw error;
        
        if (data.user) {
          if (form.rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('userEmail', form.email);
          }
          onLogin(data.user);
        }
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>ZenTrackr</h1>
          <p>{isSignUp ? 'Create your account' : 'Welcome back'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          {!isSignUp && (
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={form.rememberMe}
                  onChange={handleChange}
                />
                <span className="checkmark"></span>
                Remember me
              </label>
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button type="submit" className="btn login-btn" disabled={loading}>
            {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              type="button"
              className="link-btn"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;