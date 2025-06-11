// src/pages/Feed/Feed.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Feed.css';
import logo from '../../assets/images/logo1.png';
import { useAuth } from '../../context/AuthContext.js';
import { chatApi } from '../../api.js';

const Feed = () => {
    const { currentUser } = useAuth();
    console.log('currentUser:', currentUser);
    const [expandedCard, setExpandedCard] = useState(null);
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('feed');
    const navigate = useNavigate();

    // Загрузка пользователей из API
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('/api/match/match', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // Преобразуем данные к нужному формату для карточек
                let users = response.data.map(u => ({
                    id: u.partner_id,
                    firstName: u.first_name,
                    lastName: u.last_name,
                    city: u.city || '',
                    age: u.age || (u.birth_date ? getAgeFromBirthDate(u.birth_date) : ''),
                    experience: u.experience_level,
                    interests: Array.isArray(u.workout_types)
                        ? u.workout_types
                        : typeof u.workout_types === 'string'
                            ? u.workout_types.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean)
                            : [],
                    goal: (u.goals && (Array.isArray(u.goals) ? u.goals[0] : typeof u.goals === 'string' ? u.goals.replace(/[{}]/g, '').split(',')[0] : '')) || '',
                    bio: u.about_text,
                    photo: u.profile_picture_url,
                }));
                // Фильтруем свой профиль
                if (currentUser && currentUser.id) {
                    users = users.filter(u => u.id !== currentUser.id);
                }
                setUsers(users);
            } catch (err) {
                setError('Не удалось загрузить пользователей');
                console.error('Error fetching users:', err);
            } finally {
                setIsLoading(false);
            }
        };

        // Проверяем, нужно ли обновить ленту
        if (localStorage.getItem('feedNeedsRefresh') === 'true') {
            localStorage.removeItem('feedNeedsRefresh');
            fetchUsers();
        } else {
            fetchUsers();
        }
    }, [currentUser]);

    const toggleCardExpand = (user) => {
        setExpandedCard(expandedCard && expandedCard.id === user.id ? null : user);
    };

    const startChat = async (userId) => {
        try {
            const res = await chatApi.startNewChat(userId);
            if (res && res.data && res.data.chatId) {
                navigate(`/chat/${res.data.chatId}`);
            } else {
                alert('Не удалось создать или найти чат');
            }
        } catch (err) {
            alert('Ошибка при создании чата');
            console.error('Chat create error:', err);
        }
    };

    const getExperienceLabel = (exp) => {
        switch (exp) {
            case 'beginner': return 'Новичок (0-6 мес.)';
            case 'intermediate': return 'Продолжающий (6 мес.-2 года)';
            case 'advanced': return 'Профи (2+ года)';
            default: return exp;
        }
    };

    const getGoalLabel = (goal) => {
        switch (goal) {
            case 'muscle_gain':
            case 'mass_gain': return 'Набор массы';
            case 'weight_loss': return 'Сброс веса';
            case 'maintenance': return 'Поддержание формы';
            case 'other': return 'Другое';
            default: return goal;
        }
    };

    const getInterestLabel = (interest) => {
        switch (interest) {
            case 'strength': return 'Силовые';
            case 'cardio': return 'Кардио';
            case 'group': return 'Групповые';
            default: return interest;
        }
    };

    // Удаляем дубликаты по id (user_id, id, _id)
    const uniqueUsers = [];
    const seenIds = new Set();
    for (const u of users) {
        const userId = String(u.id || u.user_id || u._id);
        if (!seenIds.has(userId)) {
            uniqueUsers.push(u);
            seenIds.add(userId);
        }
    }

    // Далее фильтруем свой профиль
    const filteredUsers = currentUser
        ? uniqueUsers.filter(u => {
            const userId = String(u.id || u.user_id || u._id);
            const myId = String(currentUser.id || currentUser.user_id || currentUser._id);
            return userId !== myId;
        })
        : uniqueUsers;

    // Добавляю функцию для вычисления возраста по дате рождения
    function getAgeFromBirthDate(birthDate) {
        if (!birthDate) return '';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    // Функция для правильного склонения слова "год"
    function getAgeWithWord(age) {
        if (!age) return '—';
        age = Number(age);
        if (isNaN(age)) return age;
        const lastDigit = age % 10;
        const lastTwoDigits = age % 100;
        if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
            return `${age} лет`;
        }
        if (lastDigit === 1) {
            return `${age} год`;
        }
        if (lastDigit >= 2 && lastDigit <= 4) {
            return `${age} года`;
        }
        return `${age} лет`;
    }

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Загрузка пользователей...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <p className="error-message">{error}</p>
                <button onClick={() => window.location.reload()}>Попробовать снова</button>
            </div>
        );
    }

    return (
        <div className="feed-page">
            <div className="main-page">
                {/* Основное содержимое */}
                <main className="content">
                    <h2 className="page-title">Подходящие партнеры для тренировок</h2>

                    <div className="users-grid">
                        {filteredUsers.map(user => (
                            <div key={user.id} className="user-card">
                                <div className="card-header">
                                    <div className="user-photo-container">
                                        <img 
                                            src={user.photo || '/default-avatar.jpg'} 
                                            alt={`${user.firstName} ${user.lastName}`} 
                                            className="user-photo"
                                            onError={(e) => {
                                                e.target.src = '/default-avatar.jpg';
                                            }}
                                        />
                                    </div>
                                    <div className="user-info">
                                        <h3 className="user-name">{user.firstName} {user.lastName}</h3>
                                    </div>
                                </div>

                                <div className="card-body">
                                    <p className="user-bio">{user.bio}</p>
                                </div>

                                <div className="card-actions">
                                    <button
                                        className="details-button"
                                        onClick={() => toggleCardExpand(user)}
                                    >
                                        Подробнее
                                    </button>
                                    <button
                                        className="chat-button"
                                        onClick={() => startChat(user.id)}
                                    >
                                        Начать диалог
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>

                {/* Поп-ап с подробной информацией */}
                {expandedCard && (
                    <div className="modal-overlay">
                        <div className="user-modal">
                            <div className="modal-content">
                                <button
                                    className="close-modal"
                                    onClick={() => setExpandedCard(null)}
                                >
                                    &times;
                                </button>

                                <div className="modal-header">
                                    <img src={expandedCard.photo || '/default-avatar.jpg'} alt={`${expandedCard.firstName} ${expandedCard.lastName}`} className="modal-photo" onError={(e) => { e.target.src = '/default-avatar.jpg'; }} />
                                    <div className="modal-user-info">
                                        <h3>{expandedCard.firstName} {expandedCard.lastName}</h3>
                                        <p className="user-detail"><strong>Город:</strong> {expandedCard.city}</p>
                                        <p className="user-detail"><strong>Возраст:</strong> {getAgeWithWord(expandedCard.age)}</p>
                                        <p className="user-detail"><strong>Опыт:</strong> {getExperienceLabel(expandedCard.experience)}</p>
                                    </div>
                                </div>

                                <div className="modal-body">
                                    <div className="details-section">
                                        <p><strong>Цель тренировок:</strong> {getGoalLabel(expandedCard.goal) || '—'}</p>
                                    </div>

                                    <div className="details-section">
                                        <h4>Интересующие виды тренировок:</h4>
                                        <div className="interests-list">
                                            {Array.isArray(expandedCard.interests) && expandedCard.interests.length > 0
                                                ? expandedCard.interests.map(interest => (
                                                    <span key={interest} className="interest-tag">
                                                        {getInterestLabel(interest)}
                                                    </span>
                                                ))
                                                : <span style={{color: '#aaa'}}>—</span>
                                            }
                                        </div>
                                    </div>

                                    <div className="details-section">
                                        <h4>О себе:</h4>
                                        <p>{expandedCard.bio}</p>
                                    </div>
                                </div>

                                <div className="modal-actions">
                                    <button
                                        className="modal-chat-button"
                                        onClick={() => startChat(expandedCard.id)}
                                    >
                                        Начать диалог
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Feed;