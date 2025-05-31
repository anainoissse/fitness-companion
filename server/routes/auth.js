const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

const router = express.Router();

// Регистрация (только users)
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING user_id, email`,
      [email, password_hash]
    );
    const user_id = newUser.rows[0].user_id;

    res.json({ message: 'Пользователь успешно зарегистрирован', user: { user_id, email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'Пользователь не найден' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Неверный пароль' });
    }

    const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '1h' });
    res.json({ token, user: { user_id: user.user_id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить информацию о текущем пользователе
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Нет токена' });
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Нет токена' });
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    } catch (err) {
      return res.status(401).json({ error: 'Неверный токен' });
    }
    const userId = decoded.userId;
    const userResult = await pool.query('SELECT user_id, email FROM users WHERE user_id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(userResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание профиля (анкета)
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

router.post('/profile', authMiddleware, upload.single('photo'), async (req, res) => {
  const user_id = req.userId;
  // Для отладки: смотрим, что пришло
  console.log('req.body:', req.body);
  console.log('req.file:', req.file);
  let {
    first_name,
    last_name,
    gender,
    birth_date,
    city,
    experience_level,
    goals,
    workout_types,
    height,
    weight,
    about_text
  } = req.body;

  // Обработка пустой даты рождения
  if (!birth_date || birth_date.trim() === '') {
    birth_date = null;
  }

  // Преобразуем goals и workout_types в массивы, если они строки
  let goalsArr = goals;
  let workoutTypesArr = workout_types;
  if (typeof goals === 'string') {
    try { goalsArr = JSON.parse(goals); } catch { goalsArr = [goals]; }
  }
  if (typeof workout_types === 'string') {
    // Если строка содержит запятые — разбиваем в массив
    if (workout_types.includes(',')) {
      workoutTypesArr = workout_types.split(',').map(s => s.trim());
    } else {
      try { workoutTypesArr = JSON.parse(workout_types); } catch { workoutTypesArr = [workout_types]; }
    }
  }

  // Фото: сохраняем ссылку на файл
  let profile_picture_url = null;
  if (req.file) {
    profile_picture_url = `/uploads/${req.file.filename}`;
  }

  try {
    // Проверка: профиль уже существует?
    const exists = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [user_id]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Профиль уже существует' });
    }

    await pool.query(
      `INSERT INTO profiles (
        user_id, first_name, last_name, gender, birth_date, city, experience_level, goals, workout_types, height, weight, about_text, profile_picture_url
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
      )`,
      [
        user_id, first_name, last_name, gender, birth_date, city, experience_level,
        goalsArr, workoutTypesArr, height, weight, about_text, profile_picture_url
      ]
    );

    res.json({ message: 'Профиль успешно создан' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить профиль текущего пользователя
router.get('/profile', authMiddleware, async (req, res) => {
  const user_id = req.userId;
  try {
    const result = await pool.query(
      `SELECT first_name, last_name, city, experience_level, goals, workout_types, height, weight, about_text, profile_picture_url
       FROM profiles WHERE user_id = $1`, [user_id]
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

// Обновить профиль текущего пользователя
router.put('/profile', authMiddleware, upload.single('photo'), async (req, res) => {
  const user_id = req.userId;
  let {
    first_name,
    last_name,
    city,
    experience_level,
    goals,
    workout_types,
    height,
    weight,
    about_text
  } = req.body;

  // Преобразуем goals и workout_types в массивы, если они строки
  let goalsArr = goals;
  let workoutTypesArr = workout_types;
  if (typeof goals === 'string') {
    try { goalsArr = JSON.parse(goals); } catch { goalsArr = [goals]; }
  }
  if (typeof workout_types === 'string') {
    if (workout_types.includes(',')) {
      workoutTypesArr = workout_types.split(',').map(s => s.trim());
    } else {
      try { workoutTypesArr = JSON.parse(workout_types); } catch { workoutTypesArr = [workout_types]; }
    }
  }

  // Фото: сохраняем ссылку на файл
  let profile_picture_url = null;
  if (req.file) {
    profile_picture_url = `/uploads/${req.file.filename}`;
  }

  try {
    // Проверка: профиль существует?
    const exists = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [user_id]);
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: 'Профиль не найден' });
    }

    // Формируем SQL для обновления
    const updateFields = [
      'first_name', 'last_name', 'city', 'experience_level', 'goals', 'workout_types', 'height', 'weight', 'about_text'
    ];
    const updateValues = [first_name, last_name, city, experience_level, goalsArr, workoutTypesArr, height, weight, about_text];
    let setClause = updateFields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    let params = [...updateValues];
    if (profile_picture_url) {
      setClause += `, profile_picture_url = $${params.length + 1}`;
      params.push(profile_picture_url);
    }
    params.push(user_id);

    await pool.query(
      `UPDATE profiles SET ${setClause} WHERE user_id = $${params.length} RETURNING *`,
      params
    );

    // Возвращаем обновленный профиль
    const result = await pool.query(
      `SELECT first_name, last_name, city, experience_level, goals, workout_types, height, weight, about_text, profile_picture_url
       FROM profiles WHERE user_id = $1`, [user_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;