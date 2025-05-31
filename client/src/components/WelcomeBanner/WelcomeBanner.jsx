// src/components/WelcomeBanner/WelcomeBanner.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './WelcomeBanner.css'; // Стили для анимации
import logo from '../../assets/images/logo1.png'; // Путь к логотипу

const WelcomeBanner = ({ onAnimationEnd }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [textVisible, setTextVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Показываем текст с задержкой
    const textTimer = setTimeout(() => setTextVisible(true), 500);
    
    // Запускаем исчезновение через 3 секунды
    const animationTimer = setTimeout(() => {
      setIsVisible(false);
      if (onAnimationEnd) onAnimationEnd();
    }, 3000);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(animationTimer);
    };
  }, [onAnimationEnd]);

  if (!isVisible) return null;

  return (
    <div className="welcome-overlay">
      <div className={`welcome-content ${textVisible ? 'visible' : ''}`}>
        <h1 className="welcome-title">Добро пожаловать в</h1>
        <img 
          src={logo} 
          alt="FitPartner Logo" 
          className="welcome-logo" 
          onLoad={() => setTextVisible(true)}
        />
      </div>
    </div>
  );
};

export default WelcomeBanner;