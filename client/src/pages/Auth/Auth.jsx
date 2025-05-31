// src/pages/Auth/Auth.jsx
import React, { useState } from 'react';
import './Auth.css';
import logo from '../../assets/images/logo1.png';
import { useAuth } from '../../context/AuthContext.js';
import { useNavigate } from 'react-router-dom';

function Auth() {
    const [activeTab, setActiveTab] = useState('вход');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [passwordError, setPasswordError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [apiError, setApiError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError('');
        setPasswordError('');
        setIsLoading(true);
        try {
            if (activeTab === 'регистрация') {
                if (formData.password !== formData.confirmPassword) {
                    setPasswordError('Пароли не совпадают.');
                    setIsLoading(false);
                    return;
                }
                const result = await register({
                    email: formData.email,
                    password: formData.password
                });
                if (result.success) {
                    const loginResult = await login(formData.email, formData.password);
                    if (loginResult.success) {
                        navigate('/questionnaire');
                    } else {
                        setApiError(loginResult.error || 'Ошибка автоматического входа');
                    }
                } else {
                    setApiError(result.error || 'Ошибка регистрации');
                }
            } else {
                const result = await login(formData.email, formData.password);
                if (result.success) {
                    navigate('/feed');
                } else {
                    setApiError(result.error || 'Ошибка входа');
                }
            }
        } catch (error) {
            setApiError(error.message || 'Произошла ошибка');
        } finally {
            setIsLoading(false);
        }
    };

    const renderForm = () => {
        switch (activeTab) {
            case 'вход':
                return (
                    <form className="form-container" onSubmit={handleSubmit}>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Email"
                            required
                        />
                        <div className="password-input">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Пароль"
                                required
                            />
                            <button type="button" className="toggle-password-button" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                        {apiError && <p className="error-message">{apiError}</p>}
                        <button type="submit" disabled={isLoading}>{isLoading ? 'Загрузка...' : 'Войти'}</button>
                    </form>
                );
            case 'регистрация':
                return (
                    <form className="form-container" onSubmit={handleSubmit}>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Email"
                            required
                        />
                        <div className="password-input">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Пароль"
                                required
                            />
                            <button type="button" className="toggle-password-button" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                        <div className="password-input">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Подтвердите пароль"
                                required
                            />
                            <button type="button" className="toggle-password-button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                {showConfirmPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                        {passwordError && <p className="error-message">{passwordError}</p>}
                        {apiError && <p className="error-message">{apiError}</p>}
                        <button type="submit" disabled={isLoading}>{isLoading ? 'Загрузка...' : 'Зарегистрироваться'}</button>
                    </form>
                );
            default:
                return null;
        }
    };

    return (
        <div className="container">
            <div className="left-side"></div>
            <div className="right-side">
                <img src={logo} alt="Logo" className="logo" />
                <div className="tabs">
                    <button
                        className={activeTab === 'вход' ? 'active' : ''}
                        onClick={() => {
                            setActiveTab('вход');
                            setApiError('');
                            setPasswordError('');
                        }}
                    >
                        Вход
                    </button>
                    <button
                        className={activeTab === 'регистрация' ? 'active' : ''}
                        onClick={() => {
                            setActiveTab('регистрация');
                            setApiError('');
                            setPasswordError('');
                        }}
                    >
                        Регистрация
                    </button>
                </div>
                {renderForm()}
            </div>
        </div>
    );
}

export default Auth;