const express = require('express');
const pool = require('../db');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Middleware для проверки токена
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Нет токена' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Неверный токен' });
  }
};

// Получить публичный профиль пользователя по id
router.get('/:userId', authMiddleware, async (req, res) => {
  const userId = req.params.userId;
  try {
    const result = await pool.query(
      `SELECT first_name, last_name, city, experience_level, goals, workout_types, height, weight, about_text, profile_picture_url, birth_date
       FROM profiles WHERE user_id = $1`, [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Профиль не найден' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router; 