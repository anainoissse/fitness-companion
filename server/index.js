// server/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // парсинг JSON

// API маршруты
const authRoutes = require('./routes/auth.js');
const matchRoutes = require('./routes/match.js');
const chatRoutes = require('./routes/chat.js');
const usersRoutes = require('./routes/users.js');

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/match', matchRoutes); // /api/match
app.use('/api/users', usersRoutes);

// Статика React-приложения
app.use(express.static(path.join(__dirname, '../client/build')));

// Раздача папки uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Обработка всех остальных путей (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// --- SOCKET.IO ---
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  // userId будет приходить при подключении
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
    }
  });

  // Получение и отправка сообщений в реальном времени
  socket.on('send_message', (data) => {
    // data: { chatId, senderId, receiverId, content, message (опционально) }
    // Отправляем сообщение обоим участникам чата
    if (data.receiverId) {
      io.to(`user_${data.receiverId}`).emit('receive_message', data);
    }
    if (data.senderId) {
      io.to(`user_${data.senderId}`).emit('receive_message', data);
    }
  });
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
