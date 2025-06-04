const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Налаштування CORS для Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "http://localhost", // Змініть на ваш домен
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: "http://localhost", // Змініть на ваш домен
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Логування всіх HTTP запитів
app.use((req, res, next) => {
  console.log(`?? ${req.method} ${req.path} - ${new Date().toLocaleTimeString()}`);
  console.log('?? Headers:', {
    'user-agent': req.headers['user-agent']?.substring(0, 50) + '...',
    'authorization': req.headers.authorization ? 'Bearer ***' : 'None',
    'x-session-id': req.headers['x-session-id'] || 'None',
    'cookie': req.headers.cookie ? 'Present' : 'None'
  });
  next();
});

// Підключення до MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student_chat';

console.log('?? Attempting to connect to MongoDB...');
console.log('?? MongoDB URI:', MONGODB_URI);

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('? Connected to MongoDB successfully!');
  })
  .catch((error) => {
    console.error('? MongoDB connection error:', error.message);
    console.log('??  Server will continue running without database (some features may not work)');
  });

// Імпорт моделей
const Chat = require('./models/Chat');
const Message = require('./models/Message');
// User модель видалена - користувачі зберігаються в MySQL через PHP

// Імпорт маршрутів
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const authRoutes = require('./routes/authRoutes');

// Використання маршрутів
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);

// Зберігання активних користувачів
const activeUsers = new Map();
const userSocketMap = new Map(); // Мапінг userId -> socketId

// Socket.IO обробка подій
io.on('connection', (socket) => {
  console.log('?? User connected:', socket.id);

  // Користувач приєднується до системи
  socket.on('user_join', (userData) => {
    console.log(`?? User joining:`, userData);
    
    // Зберігаємо інформацію про користувача
    activeUsers.set(socket.id, {
      userId: userData.userId,
      username: userData.username,
      socketId: socket.id,
      status: 'online',
      lastSeen: new Date()
    });
    
    // Мапінг userId -> socketId для швидкого пошуку
    userSocketMap.set(userData.userId, socket.id);

    // Повідомляємо всіх про новий онлайн статус
    socket.broadcast.emit('user_status_change', {
      userId: userData.userId,
      username: userData.username,
      status: 'online',
      lastSeen: new Date()
    });

    console.log(`? ${userData.username} joined the chat (ID: ${userData.userId})`);
  });

  // Приєднання до конкретного чату
  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    console.log(`?? User ${socket.id} joined chat room: ${chatId}`);
    
    // Повідомляємо інших учасників чату про приєднання
    const user = activeUsers.get(socket.id);
    if (user) {
      socket.to(chatId).emit('user_joined_chat', {
        userId: user.userId,
        username: user.username,
        chatId: chatId
      });
    }
  });

  // Покидання чату
  socket.on('leave_chat', (chatId) => {
    socket.leave(chatId);
    console.log(`?? User ${socket.id} left chat room: ${chatId}`);
    
    // Повідомляємо інших учасників чату про від'єднання
    const user = activeUsers.get(socket.id);
    if (user) {
      socket.to(chatId).emit('user_left_chat', {
        userId: user.userId,
        username: user.username,
        chatId: chatId
      });
    }
  });

  // Надсилання повідомлення
  socket.on('send_message', async (messageData) => {
    try {
      console.log('?? Received message data:', messageData);
      
      // Перевіряємо обов'язкові поля
      if (!messageData.chatId || !messageData.senderId || !messageData.senderName || !messageData.content) {
        console.error('? Missing required fields:', messageData);
        socket.emit('message_error', { 
          error: 'Missing required fields',
          required: ['chatId', 'senderId', 'senderName', 'content']
        });
        return;
      }

      // Перевіряємо чи існує чат
      const chat = await Chat.findById(messageData.chatId);
      if (!chat) {
        console.error('? Chat not found:', messageData.chatId);
        socket.emit('message_error', { error: 'Chat not found' });
        return;
      }

      // Створюємо нове повідомлення в базі даних
      const newMessage = new Message({
        chatId: messageData.chatId,
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        content: messageData.content.trim(),
        messageType: messageData.messageType || 'text',
        timestamp: new Date()
      });

      const savedMessage = await newMessage.save();
      console.log('?? Message saved to database:', savedMessage._id);

      // Оновлюємо останнє повідомлення в чаті
      await Chat.findByIdAndUpdate(messageData.chatId, {
        lastMessage: savedMessage._id,
        lastActivity: new Date()
      });

      // Формуємо дані повідомлення для відправки
      const messageToSend = {
        _id: savedMessage._id,
        chatId: savedMessage.chatId,
        senderId: savedMessage.senderId,
        senderName: savedMessage.senderName,
        content: savedMessage.content,
        timestamp: savedMessage.timestamp,
        messageType: savedMessage.messageType,
        createdAt: savedMessage.createdAt || savedMessage.timestamp,
        isEdited: savedMessage.isEdited,
        readBy: savedMessage.readBy
      };      // Надсилаємо повідомлення всім учасникам чату (включаючи відправника)
      io.to(messageData.chatId).emit('new_message', messageToSend);

      // Відправляємо сповіщення тільки отримувачам (не відправнику)
      // Знаходимо всіх учасників чату, крім відправника
      const recipients = chat.participants.filter(participant => 
        participant.userId !== messageData.senderId
      );

      // Відправляємо персональні сповіщення кожному отримувачу
      recipients.forEach(recipient => {
        const recipientSocketId = userSocketMap.get(recipient.userId);
        if (recipientSocketId) {
          // Відправляємо сповіщення конкретному користувачу
          io.to(recipientSocketId).emit('global_new_message', {
            ...messageToSend,
            recipientId: recipient.userId,
            recipientName: recipient.username
          });
          console.log(`? Notification sent to ${recipient.username} (${recipient.userId})`);
        } else {
          console.log(`? User ${recipient.username} (${recipient.userId}) is offline - notification skipped`);
        }
      });

      console.log(`? Message broadcasted to chat ${messageData.chatId} by ${messageData.senderName}`);
      
      // Надсилаємо підтвердження відправнику
      socket.emit('message_sent', {
        tempId: messageData.tempId,
        messageId: savedMessage._id,
        timestamp: savedMessage.timestamp
      });

    } catch (error) {
      console.error('? Error sending message:', error);
      socket.emit('message_error', { 
        error: 'Failed to send message',
        details: error.message,
        tempId: messageData.tempId
      });
    }
  });

  // Користувач друкує
  socket.on('typing_start', (data) => {
    console.log(`?? User ${data.username} started typing in chat ${data.chatId}`);
    socket.to(data.chatId).emit('user_typing', {
      userId: data.userId,
      username: data.username,
      chatId: data.chatId,
      isTyping: true
    });
  });

  // Користувач перестав друкувати
  socket.on('typing_stop', (data) => {
    console.log(`?? User ${data.username} stopped typing in chat ${data.chatId}`);
    socket.to(data.chatId).emit('user_typing', {
      userId: data.userId,
      username: data.username,
      chatId: data.chatId,
      isTyping: false
    });
  });

  // Позначення повідомлень як прочитаних
  socket.on('mark_messages_read', async (data) => {
    try {
      const { chatId, userId } = data;
      
      // Отримуємо всі непрочитані повідомлення користувача в цьому чаті
      const unreadMessages = await Message.find({
        chatId,
        senderId: { $ne: userId },
        'readBy.userId': { $ne: userId },
        isDeleted: false
      });

      // Позначаємо всі як прочитані
      for (const message of unreadMessages) {
        message.markAsRead(userId);
        await message.save();
      }

      // Повідомляємо інших учасників про прочитання
      socket.to(chatId).emit('messages_read', {
        userId,
        chatId,
        readCount: unreadMessages.length
      });

      console.log(`?? Marked ${unreadMessages.length} messages as read for user ${userId} in chat ${chatId}`);
    } catch (error) {
      console.error('? Error marking messages as read:', error);
    }
  });

  // Запит онлайн статусу користувачів
  socket.on('get_online_users', (callback) => {
    const onlineUsers = Array.from(activeUsers.values()).map(user => ({
      userId: user.userId,
      username: user.username,
      status: 'online',
      lastSeen: user.lastSeen
    }));
    
    if (callback && typeof callback === 'function') {
      callback(onlineUsers);
    }
  });

  // Відключення користувача
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      console.log(`?? ${user.username} disconnecting...`);
      
      // Видаляємо з мапінгів
      userSocketMap.delete(user.userId);
      activeUsers.delete(socket.id);
      
      // Оновлюємо статус на офлайн
      socket.broadcast.emit('user_status_change', {
        userId: user.userId,
        username: user.username,
        status: 'offline',
        lastSeen: new Date()
      });

      console.log(`? ${user.username} disconnected (ID: ${user.userId})`);
    } else {
      console.log(`? Unknown user disconnected: ${socket.id}`);
    }
  });

  // Обробка помилок socket
  socket.on('error', (error) => {
    console.error('? Socket error:', error);
  });
});

// Базовий маршрут
app.get('/', (req, res) => {
  res.json({ 
    message: 'Student Chat Server is running!',
    status: 'active',
    version: '1.1.0',
    features: [
      'Real-time messaging',
      'User status tracking',
      'Message persistence',
      'Typing indicators',
      'Read receipts'
    ]
  });
});

// Отримання списку активних користувачів
app.get('/api/active-users', (req, res) => {
  const users = Array.from(activeUsers.values()).map(user => ({
    userId: user.userId,
    username: user.username,
    status: user.status,
    lastSeen: user.lastSeen,
    socketId: user.socketId
  }));
  
  res.json({
    success: true,
    data: users,
    count: users.length
  });
});

// Статистика сервера
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      activeConnections: activeUsers.size,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      mongoConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    }
  });
});

// Обробка помилок Express
app.use((err, req, res, next) => {
  console.error('? Express error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`?? Chat server running on port ${PORT}`);
  console.log(`?? Access at: http://localhost:${PORT}`);
  console.log(`?? Stats at: http://localhost:${PORT}/api/stats`);
  console.log(`?? Active users at: http://localhost:${PORT}/api/active-users`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('?? SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('? Server closed');
    mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = { app, io, server };
