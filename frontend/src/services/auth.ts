import api from './api';

export const login = async (email: string, password: string): Promise<any> => {
  const response: any = await api.post('/auth/login', { email, password });
  if (response.success && response.data?.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response;
};

export const verifyOtp = async (tempToken: string, otpCode: string): Promise<any> => {
  const response: any = await api.post('/auth/verify-otp', { tempToken, otpCode });
  if (response.success && response.data?.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response;
};

export const resendOtp = async (tempToken: string): Promise<any> => {
  const response: any = await api.post('/auth/resend-otp', { tempToken });
  return response;
};

export const googleLogin = async (credential?: string, name?: string, email?: string): Promise<any> => {
  const response: any = await api.post('/auth/google', { credential, name, email });
  if (response.success && response.data?.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response;
};


export const register = async (name: string, email: string, password: string): Promise<any> => {
  const response: any = await api.post('/auth/register', { name, email, password });
  if (response.success && response.data?.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};

