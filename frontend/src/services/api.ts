import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  || (import.meta.env.PROD ? 'https://backend.drawschema.fwitech.com/api' : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Preserve Axios cancellation errors intact
    if (axios.isCancel(error) || error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    // Only log out if DrawSchema's own session token is rejected, NOT when an external downstream API call fails
    const isAICommandRoute = error.config?.url?.includes('/ai/');

    if (error.response && error.response.status === 401 && !isAICommandRoute) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // If we are not on the login/register page, redirect to login
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data || { message: 'Network Error' });
  }
);

export default api;
export { API_BASE_URL };
