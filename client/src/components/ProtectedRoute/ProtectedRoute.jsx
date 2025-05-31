import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';

const ProtectedRoute = () => {
    const { currentUser, isLoading } = useAuth();

    if (isLoading) {
        return <div className="loading-spinner">Загрузка...</div>;
    }

    if (!currentUser) {
        // Перенаправляем на страницу входа, если пользователь не авторизован
        return <Navigate to="/auth" replace />;
    }

    // Если авторизован - рендерим дочерние маршруты
    return <Outlet />;
};

export default ProtectedRoute;