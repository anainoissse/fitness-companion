// src/pages/Onboarding/QuestionnairePage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import WelcomeBanner from '../../components/WelcomeBanner/WelcomeBanner.jsx';
import './Questionnaire.css'; // Перенесите сюда стили из index.css
import logo from '../../assets/images/logo1.png'; // Обновите путь к изображению
import { saveQuestionnaire } from '../../api.js';

const QuestionnairePage = () => {
    const navigate = useNavigate();
    const [showForm, setShowForm] = useState(false); // Новое состояние для управления показом формы
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        gender: '',
        birth_date: '',
        city: '',
        experience_level: '',
        goals: '',
        workout_types: [],
        height: '',
        weight: '',
        about_text: '',
        photo: null
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleInterestChange = (e) => {
        const value = e.target.value;
        setSelectedInterests(prev =>
            e.target.checked
                ? [...prev, value]
                : prev.filter(item => item !== value))
    };

    const handleWorkoutTypeChange = (e) => {
        const value = e.target.value;
        setFormData(prev => ({
            ...prev,
            workout_types: e.target.checked
                ? [...prev.workout_types, value]
                : prev.workout_types.filter(item => item !== value)
        }));
    };

    const handleGoalsChange = (e) => {
        setFormData(prev => ({
            ...prev,
            goals: e.target.value
        }));
    };

    const handlePhotoChange = (e) => {
        setFormData(prev => ({ ...prev, photo: e.target.files[0] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await saveQuestionnaire({ ...formData, goals: [formData.goals] });
            localStorage.setItem('onboardingCompleted', 'true');
            navigate('/feed');
        } catch (error) {
            console.error('Ошибка отправки анкеты:', error);
            alert('Произошла ошибка при сохранении данных');
        }
    };

    return (
        <div className="welcome-page">
            <div className="form-container">
                <form className="questionnaire-form" onSubmit={handleSubmit}>
                    <h2 className="form-title">
                        Начните свое фитнес-путешествие
                    </h2>
                    <p className="form-description">
                        Пожалуйста, заполните данные о себе! Это поможет нам в подборе партнёров.
                    </p>

                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="first_name" className="form-label">Имя</label>
                            <input
                                type="text"
                                id="first_name"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                className="form-input"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="last_name" className="form-label">Фамилия</label>
                            <input
                                type="text"
                                id="last_name"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                className="form-input"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="gender" className="form-label">Пол</label>
                            <select
                                id="gender"
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className="form-select"
                                required
                            >
                                <option value="">Выберите пол</option>
                                <option value="M">Мужской</option>
                                <option value="F">Женский</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="city" className="form-label">Город</label>
                            <input
                                type="text"
                                id="city"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="form-input"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="experience_level" className="form-label">Опыт</label>
                            <select
                                id="experience_level"
                                name="experience_level"
                                value={formData.experience_level}
                                onChange={handleChange}
                                className="form-select"
                                required
                            >
                                <option value="">Выберите опыт</option>
                                <option value="beginner">Новичок (0-6 мес.)</option>
                                <option value="intermediate">Продолжающий (6 мес.-2 года)</option>
                                <option value="advanced">Профи (более 2 лет)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="goals" className="form-label">Цель</label>
                            <select
                                id="goals"
                                name="goals"
                                value={formData.goals}
                                onChange={handleGoalsChange}
                                className="form-select"
                                required
                            >
                                <option value="">Выберите цель</option>
                                <option value="mass_gain">Набор массы</option>
                                <option value="maintenance">Поддержание формы</option>
                                <option value="weight_loss">Сброс массы</option>
                                <option value="undecided">Не определился</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="height" className="form-label">Рост (см)</label>
                            <input
                                type="number"
                                id="height"
                                name="height"
                                value={formData.height}
                                onChange={handleChange}
                                className="form-input"
                                min="100"
                                max="250"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="weight" className="form-label">Вес (кг)</label>
                            <input
                                type="number"
                                id="weight"
                                name="weight"
                                value={formData.weight}
                                onChange={handleChange}
                                className="form-input"
                                min="30"
                                max="200"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="birth_date" className="form-label">Дата рождения</label>
                            <input
                                type="date"
                                id="birth_date"
                                name="birth_date"
                                value={formData.birth_date}
                                onChange={handleChange}
                                className="form-input"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <label className="section-label">Интересующие виды тренировок</label>
                        <div className="checkbox-grid">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    name="workout_types"
                                    value="strength"
                                    onChange={handleWorkoutTypeChange}
                                    checked={formData.workout_types.includes("strength")}
                                    className="checkbox-input"
                                />
                                <span className="checkbox-custom"></span>
                                <span>Силовые</span>
                            </label>
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    name="workout_types"
                                    value="cardio"
                                    onChange={handleWorkoutTypeChange}
                                    checked={formData.workout_types.includes("cardio")}
                                    className="checkbox-input"
                                />
                                <span className="checkbox-custom"></span>
                                <span>Кардио</span>
                            </label>
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    name="workout_types"
                                    value="group"
                                    onChange={handleWorkoutTypeChange}
                                    checked={formData.workout_types.includes("group")}
                                    className="checkbox-input"
                                />
                                <span className="checkbox-custom"></span>
                                <span>Групповые</span>
                            </label>
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    name="workout_types"
                                    value="undecided"
                                    onChange={handleWorkoutTypeChange}
                                    checked={formData.workout_types.includes("undecided")}
                                    className="checkbox-input"
                                />
                                <span className="checkbox-custom"></span>
                                <span>Не определился</span>
                            </label>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="about_text" className="form-label">О себе</label>
                        <textarea
                            id="about_text"
                            name="about_text"
                            value={formData.about_text}
                            onChange={handleChange}
                            className="form-textarea"
                            minLength={30}
                            required
                        ></textarea>
                        <div className="char-counter">{formData.about_text.length}/30 символов</div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="photo" className="form-label">Фото профиля</label>
                        <div className="file-upload">
                            <label className="file-upload-label">
                                <input
                                    type="file"
                                    id="photo"
                                    name="photo"
                                    onChange={handlePhotoChange}
                                    className="file-upload-input"
                                    accept="image/*"
                                    required
                                />
                                <span className="file-upload-text">
                                    {formData.photo ? formData.photo.name : 'Выберите файл'}
                                </span>
                                <span className="file-upload-button">Обзор</span>
                            </label>
                        </div>
                    </div>

                    <button type="submit" className="submit-button">
                        Начать поиск единомышленников
                    </button>
                </form>
            </div>
        </div>
    );
};

export default QuestionnairePage;