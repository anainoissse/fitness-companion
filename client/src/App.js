// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout.jsx';
import Auth from './pages/Auth/Auth.jsx';
import Questionnaire from './pages/Onboarding/Questionnaire.jsx';
import Feed from './pages/Feed/Feed.jsx';
import Profile from './pages/Profile/Profile.jsx';
import Chat from './pages/Chat/Chat.jsx';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute.jsx';
import { AuthProvider } from './context/AuthContext.js';

const RootRedirect = () => {
    const completed = localStorage.getItem('onboardingCompleted') === 'true';
    return <Navigate to={completed ? "/feed" : "/questionnaire"} replace />;
};

const App = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Публичные маршруты */}
                    <Route path="/auth" element={<Auth />} />

                    {/* Защищённые маршруты */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/questionnaire" element={<Questionnaire />} />
                        <Route element={<Layout />}>
                            <Route path="/" element={<RootRedirect />} />
                            <Route path="/feed" element={<Feed />} />
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/chat" element={<Chat />} />
                            <Route path="/chat/:chatId" element={<Chat />} />
                        </Route>
                    </Route>

                    {/* Обработка 404 */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
};

export default App;
