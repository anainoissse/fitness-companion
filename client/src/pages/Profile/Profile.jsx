// src/pages/Profile/Profile.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Profile.css';

const Profile = () => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        city: '',
        experience: '',
        interests: [],
        goal: '',
        height: '',
        weight: '',
        bio: '',
        photo: null
    });
    const [photoPreview, setPhotoPreview] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Вспомогательная функция для преобразования snake_case в camelCase
    function mapProfileFields(data) {
        if (!data) return {};
        // interests
        let interests = [];
        if (Array.isArray(data.workout_types)) {
            interests = data.workout_types;
        } else if (typeof data.workout_types === 'string' && data.workout_types.length > 0) {
            // Удаляем фигурные скобки и разбиваем по запятой
            interests = data.workout_types.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean);
        }
        // goal
        let goal = '';
        if (Array.isArray(data.goals)) {
            goal = data.goals[0] || '';
        } else if (typeof data.goals === 'string' && data.goals.length > 0) {
            // Удаляем фигурные скобки и берем первый элемент
            const arr = data.goals.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean);
            goal = arr[0] || '';
        }
        return {
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            city: data.city || '',
            experience: data.experience_level || '',
            interests,
            goal,
            height: data.height || '',
            weight: data.weight || '',
            bio: data.about_text || '',
            photo: null,
            photoUrl: data.profile_picture_url || '/default-avatar.jpg',
        };
    }

    // Загрузка данных профиля
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('/api/auth/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('SERVER PROFILE RESPONSE:', response.data);
                const data = response.data;
                const mapped = mapProfileFields(data);
                setUserData(mapped);
                setFormData({
                    firstName: mapped.firstName,
                    lastName: mapped.lastName,
                    city: mapped.city,
                    experience: mapped.experience,
                    interests: mapped.interests,
                    goal: mapped.goal,
                    height: mapped.height,
                    weight: mapped.weight,
                    bio: mapped.bio,
                    photo: null
                });
                setPhotoPreview(mapped.photoUrl);
            } catch (err) {
                setError('Не удалось загрузить профиль');
                console.error('Profile load error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e) => {
        const { value, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            interests: checked
                ? [...prev.interests, value]
                : prev.interests.filter(item => item !== value)
        }));
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, photo: file }));
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const formPayload = new FormData();
            
            // Маппинг camelCase -> snake_case
            const snakeCaseMap = {
                firstName: 'first_name',
                lastName: 'last_name',
                city: 'city',
                experience: 'experience_level',
                interests: 'workout_types',
                goal: 'goals',
                height: 'height',
                weight: 'weight',
                bio: 'about_text'
            };
            // Добавляем текстовые данные
            Object.entries(formData).forEach(([key, value]) => {
                if (key !== 'photo' && value !== null) {
                    const snakeKey = snakeCaseMap[key] || key;
                    if (Array.isArray(value)) {
                        value.forEach(item => formPayload.append(snakeKey, item));
                    } else {
                        formPayload.append(snakeKey, value);
                    }
                }
            });

            // Добавляем файл фото, если есть
            if (formData.photo) {
                formPayload.append('photo', formData.photo);
            }

            const token = localStorage.getItem('token');
            const response = await axios.put('/api/auth/profile', formPayload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });

            setUserData(response.data);
            setSuccess('Профиль успешно обновлен!');
            setIsEditing(false);
            localStorage.setItem('feedNeedsRefresh', 'true');
            
            // Обновляем превью если было новое фото
            if (formData.photo) {
                setPhotoPreview(URL.createObjectURL(formData.photo));
            }

            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Ошибка при обновлении профиля');
            console.error('Profile update error:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Загрузка профиля...</p>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="error-container">
                <p>Профиль не найден</p>
                <button onClick={() => navigate('/')}>На главную</button>
            </div>
        );
    }

    return (
        <div className="profile-page">
            <div className="profile-edit-container">
                <div className="profile-edit-title">Мой профиль</div>
                <button 
                    onClick={() => {
                        if (!isEditing && userData) {
                            setFormData({
                                firstName: userData.firstName || '',
                                lastName: userData.lastName || '',
                                city: userData.city || '',
                                experience: userData.experience || '',
                                interests: userData.interests || [],
                                goal: userData.goal || '',
                                height: userData.height || '',
                                weight: userData.weight || '',
                                bio: userData.bio || '',
                                photo: null
                            });
                        }
                        setIsEditing(!isEditing);
                    }}
                    className="submit-button"
                    style={{marginBottom: '1.5rem'}}
                >
                    {isEditing ? 'Отменить' : 'Редактировать'}
                </button>
                {error && <div className="validation-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}
                {isEditing ? (
                    <form onSubmit={handleSubmit} className="profile-edit-form">
                        <div className="photo-upload-section">
                            <div className="photo-preview-container">
                                <img 
                                    src={photoPreview} 
                                    alt="Ваше фото" 
                                    className="profile-photo"
                                    onError={(e) => {
                                        e.target.src = '/default-avatar.jpg';
                                    }}
                                />
                                <label className="photo-upload-label">
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        className="photo-upload-input"
                                        onChange={handlePhotoChange}
                                    />
                                    <span className="photo-upload-text">Изменить фото</span>
                                </label>
                            </div>
                        </div>

                        <div className="name-fields">
                            <div className="form-section">
                                <label className="form-label">Имя</label>
                                <input 
                                    type="text" 
                                    name="firstName"
                                    value={formData.firstName || userData.firstName || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-section">
                                <label className="form-label">Фамилия</label>
                                <input 
                                    type="text" 
                                    name="lastName"
                                    value={formData.lastName || userData.lastName || ''}
                                    onChange={handleInputChange}
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div className="form-section">
                            <label className="form-label">Город</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleInputChange}
                                className="form-input"
                            />
                        </div>

                        <div className="physical-fields">
                            <div className="form-section">
                                <label className="form-label">Рост (см)</label>
                                <input
                                    type="number"
                                    name="height"
                                    value={formData.height}
                                    onChange={handleInputChange}
                                    min="100"
                                    max="250"
                                    className="form-input"
                                />
                            </div>
                            <div className="form-section">
                                <label className="form-label">Вес (кг)</label>
                                <input
                                    type="number"
                                    name="weight"
                                    value={formData.weight}
                                    onChange={handleInputChange}
                                    min="30"
                                    max="200"
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div className="form-section">
                            <label className="form-label">Опыт тренировок</label>
                            <select
                                name="experience"
                                value={formData.experience}
                                onChange={handleInputChange}
                                className="form-select"
                            >
                                <option value="beginner">Новичок (0-6 мес.)</option>
                                <option value="intermediate">Продолжающий (6 мес.-2 года)</option>
                                <option value="advanced">Опытный (2+ года)</option>
                            </select>
                        </div>

                        <div className="form-section">
                            <label className="form-label">Цель</label>
                            <div className="radio-group">
                                {[{ value: 'muscle_gain', label: 'Набор массы' }, { value: 'weight_loss', label: 'Похудение' }, { value: 'maintenance', label: 'Поддержание формы' }].map(item => (
                                    <label key={item.value} className="radio-label">
                                        <input
                                            type="radio"
                                            name="goal"
                                            value={item.value}
                                            checked={formData.goal === item.value}
                                            onChange={handleInputChange}
                                            className="radio-input"
                                        />
                                        <span className="radio-custom"></span>
                                        {item.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="form-section">
                            <label className="form-label">Интересы</label>
                            <div className="checkbox-group">
                                {[{ value: 'strength', label: 'Силовые' }, { value: 'cardio', label: 'Кардио' }, { value: 'group', label: 'Групповые' }].map(item => (
                                    <label key={item.value} className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            value={item.value}
                                            checked={formData.interests.includes(item.value)}
                                            onChange={handleCheckboxChange}
                                            className="checkbox-input"
                                        />
                                        <span className="checkbox-custom"></span>
                                        {item.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="form-section">
                            <label className="form-label">
                                О себе
                                <span className="char-counter">{formData.bio.length}/30</span>
                            </label>
                            <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                minLength="30"
                                rows="4"
                                className="form-textarea"
                            />
                            {formData.bio.length < 30 && (
                                <p className="validation-message">Минимум 30 символов</p>
                            )}
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="submit-button">
                                Сохранить изменения
                            </button>
                        </div>
                    </form>
                ) : (
                    <form className="profile-edit-form" onSubmit={e => e.preventDefault()}>
                        <div className="photo-upload-section">
                            <div className="photo-preview-container">
                                <img 
                                    src={photoPreview} 
                                    alt="Ваше фото" 
                                    className="profile-photo"
                                    onError={(e) => {
                                        e.target.src = '/default-avatar.jpg';
                                    }}
                                />
                            </div>
                        </div>
                        <div className="name-fields">
                            <div className="form-section">
                                <label className="form-label">Имя</label>
                                <input 
                                    type="text" 
                                    name="firstName"
                                    value={formData.firstName || userData.firstName || ''}
                                    className="form-input"
                                    disabled
                                />
                            </div>
                            <div className="form-section">
                                <label className="form-label">Фамилия</label>
                                <input 
                                    type="text" 
                                    name="lastName"
                                    value={formData.lastName || userData.lastName || ''}
                                    className="form-input"
                                    disabled
                                />
                            </div>
                        </div>
                        <div className="form-section">
                            <label className="form-label">Город</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                className="form-input"
                                disabled
                            />
                        </div>
                        <div className="physical-fields">
                            <div className="form-section">
                                <label className="form-label">Рост (см)</label>
                                <input
                                    type="number"
                                    name="height"
                                    value={formData.height}
                                    min="100"
                                    max="250"
                                    className="form-input"
                                    disabled
                                />
                            </div>
                            <div className="form-section">
                                <label className="form-label">Вес (кг)</label>
                                <input
                                    type="number"
                                    name="weight"
                                    value={formData.weight}
                                    min="30"
                                    max="200"
                                    className="form-input"
                                    disabled
                                />
                            </div>
                        </div>
                        <div className="form-section">
                            <label className="form-label">Опыт тренировок</label>
                            <select
                                name="experience"
                                value={formData.experience}
                                className="form-select"
                                disabled
                            >
                                <option value="beginner">Новичок (0-6 мес.)</option>
                                <option value="intermediate">Продолжающий (6 мес.-2 года)</option>
                                <option value="advanced">Опытный (2+ года)</option>
                            </select>
                        </div>
                        <div className="form-section">
                            <label className="form-label">Цель</label>
                            <div className="radio-group">
                                {[{ value: 'muscle_gain', label: 'Набор массы' }, { value: 'weight_loss', label: 'Похудение' }, { value: 'maintenance', label: 'Поддержание формы' }].map(item => (
                                    <label key={item.value} className="radio-label">
                                        <input
                                            type="radio"
                                            name="goal"
                                            value={item.value}
                                            checked={formData.goal === item.value}
                                            className="radio-input"
                                            disabled
                                        />
                                        <span className="radio-custom"></span>
                                        {item.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="form-section">
                            <label className="form-label">Интересы</label>
                            <div className="checkbox-group">
                                {[{ value: 'strength', label: 'Силовые' }, { value: 'cardio', label: 'Кардио' }, { value: 'group', label: 'Групповые' }].map(item => (
                                    <label key={item.value} className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            value={item.value}
                                            checked={formData.interests.includes(item.value)}
                                            className="checkbox-input"
                                            disabled
                                        />
                                        <span className="checkbox-custom"></span>
                                        {item.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="form-section">
                            <label className="form-label">
                                О себе
                                <span className="char-counter">{formData.bio.length}/30</span>
                            </label>
                            <textarea
                                name="bio"
                                value={formData.bio}
                                minLength="30"
                                rows="4"
                                className="form-textarea"
                                disabled
                            />
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

// Вспомогательные функции для отображения
const getExperienceLabel = (value) => {
    const labels = {
        beginner: 'Новичок (0-6 мес.)',
        intermediate: 'Продолжающий (6 мес.-2 года)',
        advanced: 'Опытный (2+ года)'
    };
    return labels[value] || value;
};

const getGoalLabel = (value) => {
    const labels = {
        muscle_gain: 'Набор мышечной массы',
        weight_loss: 'Снижение веса',
        maintenance: 'Поддержание формы'
    };
    return labels[value] || value;
};

const getInterestLabel = (value) => {
    const labels = {
        strength: 'Силовые тренировки',
        cardio: 'Кардио тренировки',
        group: 'Групповые занятия'
    };
    return labels[value] || value;
};

export default Profile;