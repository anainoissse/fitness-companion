const express = require('express');
const pool = require('../db');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware для проверки JWT
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

// Получить историю сообщений с конкретным пользователем
// GET /api/chat/messages/:receiverId
router.get('/messages/:receiverId', authMiddleware, async (req, res) => {
  const senderId = req.userId;
  const receiverId = parseInt(req.params.receiverId);

  try {
    const messages = await pool.query(
      `SELECT * FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY sent_at ASC`,
      [senderId, receiverId]
    );
    res.json(messages.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при получении сообщений' });
  }
});

// Отправить сообщение
// POST /api/chat/messages/:receiverId
// В теле: { content: "текст сообщения" }
router.post('/messages/:receiverId', authMiddleware, async (req, res) => {
  const senderId = req.userId;
  const receiverId = parseInt(req.params.receiverId);
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Сообщение не может быть пустым' });
  }

  try {
    // Создаем чат, если его еще нет (опционально — можно реализовать отдельную логику)
    // Но для простоты — просто вставляем сообщение
    const newMessage = await pool.query(
      `INSERT INTO messages (chat_id, sender_id, receiver_id, content)
       VALUES (
         (SELECT c.chat_id FROM chats c
            JOIN chat_participants cp1 ON c.chat_id = cp1.chat_id AND cp1.user_id = $1
            JOIN chat_participants cp2 ON c.chat_id = cp2.chat_id AND cp2.user_id = $2
            LIMIT 1
         ),
         $1, $2, $3
       )
       RETURNING *`,
      [senderId, receiverId, content]
    );
    res.json(newMessage.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при отправке сообщения' });
  }
});

// Маршрут для отметки сообщений как прочитанных
// PATCH /api/chats/:chatId/read
router.patch('/chats/:chatId/read', authMiddleware, async (req, res) => {
  const chatId = parseInt(req.params.chatId);
  const userId = req.userId;

  try {
    // Обновляем все непрочитанные сообщения в чате, которые адресованы текущему пользователю
    const result = await pool.query(
      `UPDATE messages
       SET is_read = TRUE
       WHERE chat_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
      [chatId, userId]
    );

    res.json({ updated: result.rowCount });
  } catch (err) {
    console.error('Error marking messages as read:', err);
    res.status(500).json({ error: 'Ошибка при обновлении сообщений' });
  }
});

// Создать новый чат между пользователями
// POST /api/chat/chats
router.post('/chats', authMiddleware, async (req, res) => {
  const userId = req.userId;
  const { userId: otherUserId } = req.body;

  if (!otherUserId || userId === otherUserId) {
    return res.status(400).json({ error: 'Некорректный идентификатор пользователя' });
  }

  try {
    // Проверяем, существует ли уже чат между этими пользователями
    const existingChat = await pool.query(
      `SELECT c.chat_id FROM chats c
       JOIN chat_participants cp1 ON c.chat_id = cp1.chat_id AND cp1.user_id = $1
       JOIN chat_participants cp2 ON c.chat_id = cp2.chat_id AND cp2.user_id = $2
       LIMIT 1`,
      [userId, otherUserId]
    );
    if (existingChat.rows.length > 0) {
      return res.json({ chatId: existingChat.rows[0].chat_id, created: false });
    }
    // Создаём новый чат
    const chatRes = await pool.query('INSERT INTO chats DEFAULT VALUES RETURNING chat_id');
    const chatId = chatRes.rows[0].chat_id;
    await pool.query('INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2), ($1, $3)', [chatId, userId, otherUserId]);
    res.json({ chatId, created: true });
  } catch (err) {
    console.error('Ошибка при создании чата:', err);
    res.status(500).json({ error: 'Ошибка при создании чата' });
  }
});

// Получить список чатов пользователя
// GET /api/chat/chats
router.get('/chats', authMiddleware, async (req, res) => {
  const userId = req.userId;
  try {
    // Получаем чаты пользователя с последним сообщением и данными собеседника
    const chatsRes = await pool.query(`
      SELECT c.chat_id,
             u.user_id AS companion_id,
             p.first_name, p.last_name, p.profile_picture_url AS photo_url,
             m.content AS last_message,
             m.sent_at AS last_message_time,
             SUM(CASE WHEN m.receiver_id = $1 AND m.is_read = FALSE THEN 1 ELSE 0 END) AS unread
      FROM chats c
      JOIN chat_participants cp1 ON c.chat_id = cp1.chat_id AND cp1.user_id = $1
      JOIN chat_participants cp2 ON c.chat_id = cp2.chat_id AND cp2.user_id <> $1
      JOIN users u ON cp2.user_id = u.user_id
      JOIN profiles p ON p.user_id = u.user_id
      LEFT JOIN LATERAL (
        SELECT * FROM messages m2 WHERE m2.chat_id = c.chat_id ORDER BY m2.sent_at DESC LIMIT 1
      ) m ON true
      GROUP BY c.chat_id, u.user_id, p.first_name, p.last_name, p.profile_picture_url, m.content, m.sent_at
      ORDER BY last_message_time DESC NULLS LAST
    `, [userId]);
    res.json(chatsRes.rows);
  } catch (err) {
    console.error('Ошибка при получении чатов:', err);
    res.status(500).json({ error: 'Ошибка при получении чатов' });
  }
});

// Получить сообщения по chatId
// GET /api/chat/chats/:chatId/messages
router.get('/chats/:chatId/messages', authMiddleware, async (req, res) => {
  const userId = req.userId;
  const chatId = parseInt(req.params.chatId);
  if (!chatId) return res.status(400).json({ error: 'Некорректный chatId' });
  try {
    // Проверяем, что пользователь участник чата
    const isParticipant = await pool.query(
      'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
      [chatId, userId]
    );
    if (isParticipant.rows.length === 0) {
      return res.status(403).json({ error: 'Нет доступа к чату' });
    }
    const messages = await pool.query(
      'SELECT * FROM messages WHERE chat_id = $1 ORDER BY sent_at ASC',
      [chatId]
    );
    res.json(messages.rows);
  } catch (err) {
    console.error('Ошибка при получении сообщений:', err);
    res.status(500).json({ error: 'Ошибка при получении сообщений' });
  }
});

module.exports = router;