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
    const matches = await pool.query(`
      SELECT 
        u2.user_id,
        p2.first_name,
        p2.last_name,
        p2.city,
        p2.birth_date,
        p2.experience_level,
        p2.workout_types,
        p2.goals,
        p2.about_text,
        p2.profile_picture_url,
        ABS(
            (p1.weight / ((p1.height / 100.0) * (p1.height / 100.0))) - 
            (p2.weight / ((p2.height / 100.0) * (p2.height / 100.0)))
        ) AS bmi_difference
      FROM 
        profiles p1
      JOIN 
        users u1 ON p1.user_id = u1.user_id
      JOIN 
        profiles p2 ON p1.city = p2.city AND p1.user_id <> p2.user_id
      JOIN 
        users u2 ON p2.user_id = u2.user_id
      WHERE 
        -- Возраст не более чем на 3 года
        ABS(EXTRACT(YEAR FROM AGE(p1.birth_date)) - EXTRACT(YEAR FROM AGE(p2.birth_date))) <= 3
        -- Опыт совместим: не начинающий + продвинутый
        AND NOT (p1.experience_level = 'beginner' AND p2.experience_level = 'advanced')
        AND NOT (p1.experience_level = 'advanced' AND p2.experience_level = 'beginner')
        -- Совпадение типов тренировок
        AND (p1.workout_types && p2.workout_types)
        -- Цели совместимы
        AND NOT (ARRAY['mass_gain']::goal_type[] <@ p1.goals AND ARRAY['weight_loss']::goal_type[] <@ p2.goals)
        AND NOT (ARRAY['weight_loss']::goal_type[] <@ p1.goals AND ARRAY['mass_gain']::goal_type[] <@ p2.goals)
        -- ИМТ не более чем на 3
        AND ABS(
            (p1.weight / ((p1.height / 100.0) * (p1.height / 100.0))) - 
            (p2.weight / ((p2.height / 100.0) * (p2.height / 100.0)))
        ) <= 3
        -- Исключить уже существующие чаты
        AND NOT EXISTS (
          SELECT 1
          FROM chat_participants cp1
          JOIN chat_participants cp2 ON cp1.chat_id = cp2.chat_id
          WHERE cp1.user_id = p1.user_id AND cp2.user_id = p2.user_id
        )
      LIMIT 20
    `);

    res.json(matches.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;