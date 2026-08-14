import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Eye, EyeOff, Car, Shield, Clock, Building2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { LOGIN_TITLE, COMPANY_NAME, APP_NAME } from '../constants';
import { useAppStore } from '../store/useAppStore';

interface LoginPageProps {
  onNavigate: (view: 'login' | 'forgot-password') => void;
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentBgIndex, setCurrentBgIndex] = useState(0);

  const backgrounds = ['/bg1.jpg', '/bg2.jpg', '/bg3.jpg'];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgrounds.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [backgrounds.length]);

  const { login } = useAuthStore();
  const { addToast } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      await login(email, password);
      addToast({ type: 'success', message: 'Successfully logged in.' });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Background Slideshow */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        overflow: 'hidden'
      }}>
        <AnimatePresence initial={false}>
          <motion.div
            key={currentBgIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `linear-gradient(rgba(11, 26, 45, 0.65), rgba(11, 26, 45, 0.65)), url(${backgrounds[currentBgIndex]})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        </AnimatePresence>
      </div>

      {/* Background Shapes */}
      <div className="auth-bg-shape auth-bg-shape-1" style={{ zIndex: 1 }} />
      <div className="auth-bg-shape auth-bg-shape-2" style={{ zIndex: 1 }} />
      <div className="auth-bg-shape auth-bg-shape-3" style={{ zIndex: 1 }} />
      <div className="auth-bg-shape auth-bg-shape-4" style={{ zIndex: 1 }} />

      {/* Glassmorphic Form Card */}
      <div className="auth-glass-box">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                background: '#FFFFFF',
                padding: '12px 20px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'fit-content',
                margin: '0 auto 16px auto',
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
              }}
            >
              <img src="/logo.png" alt="Logo" style={{ height: '56px', objectFit: 'contain' }} />
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
              {COMPANY_NAME}
            </h2>
            <p style={{ fontSize: '15px', color: '#94A3B8', marginTop: '6px', fontWeight: '500', marginBottom: 0 }}>
              {APP_NAME}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: '14px',
                  color: '#FFFFFF',
                  background: 'rgba(255, 255, 255, 0.05)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 150ms ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#38BDF8';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(56, 189, 248, 0.15)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    width: '100%',
                    padding: '12px 44px 12px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    fontSize: '14px',
                    color: '#FFFFFF',
                    background: 'rgba(255, 255, 255, 0.05)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 150ms ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#38BDF8';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(56, 189, 248, 0.15)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px',
                  }}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Forgot password link */}
            <div style={{ textAlign: 'right', marginBottom: '24px' }}>
              <button
                type="button"
                onClick={() => onNavigate('forgot-password')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#38BDF8',
                  fontWeight: '600',
                  padding: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                Forgot Password?
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div style={{ marginBottom: '20px', padding: '10px 12px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                <p style={{ fontSize: '13px', color: '#FCA5A5', margin: 0 }}>{error}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              id="login-submit"
              type="submit"
              disabled={isSubmitting || !email || !password}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '10px',
                border: 'none',
                background: isSubmitting ? '#0284C7' : 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)',
                fontSize: '15px',
                fontWeight: '600',
                color: '#FFFFFF',
                cursor: isSubmitting ? 'wait' : 'pointer',
                transition: 'all 150ms ease',
                opacity: (!email || !password) ? 0.6 : 1,
                boxShadow: '0 4px 12px rgba(56, 189, 248, 0.25)'
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(56, 189, 248, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(56, 189, 248, 0.25)';
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      animation: 'spin 0.6s linear infinite',
                    }}
                  />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <LogIn size={16} />
                </>
              )}
            </button>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
