const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// Middleware авторизации
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

// Маршрут поиска собеседников
router.get('/match', authMiddleware, async (req, res) => {
  const userId = req.userId;

  try {
    // Получение профиля текущего пользователя
    const userProfileRes = await pool.query(`
      SELECT p.*, u.email
      FROM profiles p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.user_id = $1
    `, [userId]);

    if (userProfileRes.rows.length === 0) {
      return res.status(404).json({ error: 'Профиль не найден' });
    }

    const userProfile = userProfileRes.rows[0];

    // SQL-запрос по вашему алгоритму
    const matches = await pool.query(
      'SELECT * FROM possible_matches WHERE seeker_id = $1',
      [userId]
    );

    res.json(matches.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;