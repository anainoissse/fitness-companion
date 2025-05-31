# Fitness Companion — приложение для поиска партнёров в тренажёрный зал

SPA-приложение на React (фронтенд) + Node.js/Express (бэкенд) + PostgreSQL (БД).

## 📌 Функционал
- Регистрация/авторизация пользователей.
- Заполнение профиля (цели, опыт, фото).
- Подбор собеседников по параметрам.
- Чат между пользователями.

## 🚀 Запуск проекта

### Требования
- Node.js v18+
- PostgreSQL

### 1. Установка
```bash
git clone https://github.com/ваш-репозиторий.git
cd fitness-companion
cd server && npm install
cd ../client && npm install
```

### 2. Настройка базы данных
- Создайте БД в PostgreSQL.
- Заполните `.env` (см. пример в `.env.example`).

### 3. Запуск
```bash
# Бэкенд (из папки server)
npm run dev

# Фронтенд (из папки client)
npm start
```

## 🔧 Технологии
- **Фронтенд**: React, React Router, Axios  
- **Бэкенд**: Node.js, Express, PostgreSQL  
- **Хранение фото**: Cloudinary (или локальное)  

## 📄 Лицензия
MIT