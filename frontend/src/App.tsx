import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { Dashboard } from './pages/Dashboard';
import { Designer } from './pages/Designer';
import { isAuthenticated } from './services/auth';
import AOS from 'aos';
import 'aos/dist/aos.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '84852262602-drateeqgm242bm9qs34goai4ehcv7vgh.apps.googleusercontent.com';

// Protected Route wrapper component
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Public Route wrapper (redirects to dashboard if already logged in)
const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

export const App: React.FC = () => {
  // Check initial authentication and initialize AOS animations
  useEffect(() => {
    AOS.init({
      duration: 650,
      easing: 'ease-out-quad',
      once: true
    });

    // Default to dark mode for high fidelity look
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/designer/:projectId"
            element={
              <ProtectedRoute>
                <Designer />
              </ProtectedRoute>
            }
          />
          {/* Fallback route */}
          <Route
            path="*"
            element={<Navigate to={isAuthenticated() ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
};

export default App;

