import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { login, verifyOtp, resendOtp, googleLogin } from '../../services/auth';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'LOGIN' | 'OTP'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [userEmail, setUserEmail] = useState('');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let timer: any;
    if (step === 'OTP' && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.data?.requireVerification || res.data?.requireMfa) {
        setTempToken(res.data.tempToken);
        setUserEmail(res.data.email || email);
        if (res.data?.message) setSuccessMsg(res.data.message);
        setStep('OTP');
        setResendTimer(60);
      } else if (res.data?.token) {
        navigate('/dashboard');
      }

    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      setLoading(true);
      setError('');
      try {
        const res = await googleLogin(credentialResponse.credential);
        if (res.success) {
          navigate('/dashboard');
        }
      } catch (err: any) {
        setError(err.message || 'Google Login failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (otpCode.length !== 6) {
      setError('Please enter the full 6-digit OTP code.');
      return;
    }
    setLoading(true);
    try {
      const res = await verifyOtp(tempToken, otpCode);
      if (res.success) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await resendOtp(tempToken);
      setSuccessMsg(res.message || 'A new 6-digit code has been sent to your email.');
      setResendTimer(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 select-none px-4">
      <div 
        className="w-full max-w-md bg-slate-800/80 border border-slate-700/50 backdrop-blur-md rounded-2xl shadow-2xl p-8 space-y-6"
        data-aos="zoom-in"
      >
        {step === 'LOGIN' ? (
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/30 mb-1">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <ellipse cx="12" cy="5" rx="9" ry="3" strokeLinecap="round" strokeLinejoin="round"></ellipse>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5V19A9 3 0 0 0 21 19V5"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12A9 3 0 0 0 21 12"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Welcome Back</h2>


              <p className="text-sm text-slate-400">
                Login to design and manage your database schemas
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">Email Address</label>
                <input
                  required
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">Password</label>
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-650 text-white rounded-lg text-sm font-semibold transition duration-150 shadow-lg shadow-indigo-600/20 flex items-center justify-center"
              >
                {loading ? 'Verifying credentials...' : 'Sign In'}
              </button>
            </form>

            <div className="relative w-full flex items-center justify-center my-3">
              <div className="border-t border-slate-700/80 w-full" />
              <span className="bg-slate-800 px-3 text-[11px] text-slate-400 font-semibold uppercase absolute">Or continue with</span>
            </div>

            <div className="w-full flex justify-center pt-1">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Login was cancelled or failed.')}
                theme="filled_black"
                shape="pill"
                text="signin_with"
                width="340"
              />
            </div>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-400">
                Don't have an account?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="text-indigo-400 hover:underline font-semibold"
                >
                  Sign up
                </button>
              </p>
            </div>
          </>
        ) : (

          <>
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/30 mb-1">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <ellipse cx="12" cy="5" rx="9" ry="3" strokeLinecap="round" strokeLinejoin="round"></ellipse>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5V19A9 3 0 0 0 21 19V5"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12A9 3 0 0 0 21 12"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Two-Factor Authentication</h2>
              <p className="text-sm text-slate-400">
                We sent a 6-digit verification code to <span className="text-slate-200 font-medium">{userEmail}</span>
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg text-center">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs px-4 py-3 rounded-lg text-center">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="space-y-1.5 text-center">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">6-Digit Security Code</label>
                <input
                  required
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 bg-slate-700/60 border border-indigo-500/50 rounded-xl text-center text-3xl font-mono tracking-[0.6em] text-indigo-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-650 text-white rounded-lg text-sm font-semibold transition duration-150 shadow-lg shadow-indigo-600/20 flex items-center justify-center"
              >
                {loading ? 'Verifying OTP...' : 'Verify & Continue'}
              </button>
            </form>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/50">
              <button
                type="button"
                onClick={() => {
                  setStep('LOGIN');
                  setOtpCode('');
                  setError('');
                  setSuccessMsg('');
                }}
                className="text-slate-400 hover:text-white transition flex items-center gap-1"
              >
                ← Back to Login
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendTimer > 0 || loading}
                className="text-indigo-400 hover:underline disabled:no-underline disabled:text-slate-500 font-semibold"
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Code'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

