const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxlength: 100
  },
  type: {
    type: String,
    enum: ['private', 'group'],
    default: 'private'
  },  participants: [{
    userId: {
      type: String, // Змінюємо на String для PHP користувачів
      required: true
    },
    username: {
      type: String,
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['member', 'admin'],
      default: 'member'
    },
    lastReadMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    }
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },  createdBy: {
    type: String, // Змінюємо на String для PHP користувачів
    required: true
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  avatar: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Індекси для оптимізації
chatSchema.index({ 'participants.userId': 1 });
chatSchema.index({ lastActivity: -1 });
chatSchema.index({ type: 1 });

// Віртуальне поле для отримання кількості учасників
chatSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Метод для перевірки чи є користувач учасником чату
chatSchema.methods.isParticipant = function(userId) {
  // Створюємо можливі варіанти ID користувача
  const possibleUserIds = [
    userId.toString(),
    `php_${userId}`,
    userId.startsWith('php_') ? userId : null
  ].filter(Boolean);
  
  return this.participants.some(p => possibleUserIds.includes(p.userId.toString()));
};

// Метод для додавання учасника
chatSchema.methods.addParticipant = function(userId, username, role = 'member') {
  if (!this.isParticipant(userId)) {
    this.participants.push({
      userId,
      username,
      role,
      joinedAt: new Date()
    });
  }
  return this;
};

// Метод для видалення учасника
chatSchema.methods.removeParticipant = function(userId) {
  // Створюємо можливі варіанти ID користувача
  const possibleUserIds = [
    userId.toString(),
    `php_${userId}`,
    userId.startsWith('php_') ? userId : null
  ].filter(Boolean);
  
  this.participants = this.participants.filter(p => !possibleUserIds.includes(p.userId.toString()));
  return this;
};

// Метод для отримання назви чату для приватних чатів
chatSchema.methods.getChatName = function(currentUserId) {
  if (this.type === 'group') {
    return this.name || 'Group Chat';
  }
  
  // Створюємо можливі варіанти ID поточного користувача
  const possibleCurrentUserIds = [
    currentUserId.toString(),
    `php_${currentUserId}`,
    currentUserId.startsWith('php_') ? currentUserId : null
  ].filter(Boolean);
  
  // Для приватних чатів повертаємо ім'я іншого користувача
  const otherParticipant = this.participants.find(p => !possibleCurrentUserIds.includes(p.userId.toString()));
  return otherParticipant ? otherParticipant.username : 'Unknown User';
};

// Статичний метод для створення приватного чату
chatSchema.statics.createPrivateChat = async function(user1Id, user1Name, user2Id, user2Name) {
  // Перевіряємо чи вже існує приватний чат між цими користувачами
  const existingChat = await this.findOne({
    type: 'private',
    'participants.userId': { $all: [user1Id, user2Id] }
  });

  if (existingChat) {
    return existingChat;
  }

  // Створюємо новий приватний чат
  const newChat = new this({
    type: 'private',
    participants: [
      { userId: user1Id, username: user1Name },
      { userId: user2Id, username: user2Name }
    ],
    createdBy: user1Id
  });

  return await newChat.save();
};

module.exports = mongoose.model('Chat', chatSchema);
