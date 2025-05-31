import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Создаём контекст
const AuthContext = createContext();

// Провайдер для обёртки приложения
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Проверяем авторизацию при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await axios.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setCurrentUser(response.data);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Функция входа
  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      setCurrentUser(response.data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Ошибка входа' };
    }
  };

  // Функция регистрации
  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData);
      return { success: true, user: response.data.user };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Ошибка регистрации' };
    }
  };

  // Функция выхода
  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  // Проверка завершения onboarding
  const isOnboardingCompleted = () => {
    return localStorage.getItem('onboardingCompleted') === 'true';
  };

  // Пометить onboarding как завершённый
  const completeOnboarding = () => {
    localStorage.setItem('onboardingCompleted', 'true');
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      isLoading,
      login,
      register,
      logout,
      isOnboardingCompleted,
      completeOnboarding
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Кастомный хук для удобного использования
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};