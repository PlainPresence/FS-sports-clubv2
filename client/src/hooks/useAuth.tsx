import { useState } from 'react';
import { loginAdmin, logoutAdmin } from '@/lib/firebase';
import { useAuthContext } from '@/context/AuthContext';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuthContext();

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await loginAdmin(email, password);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const result = await logoutAdmin();
      return result;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };
};
