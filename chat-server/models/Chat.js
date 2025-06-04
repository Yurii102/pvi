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
      type: String, // ������� �� String ��� PHP ������������
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
    type: String, // ������� �� String ��� PHP ������������
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

// ������� ��� ����������
chatSchema.index({ 'participants.userId': 1 });
chatSchema.index({ lastActivity: -1 });
chatSchema.index({ type: 1 });

// ³�������� ���� ��� ��������� ������� ��������
chatSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// ����� ��� �������� �� � ���������� ��������� ����
chatSchema.methods.isParticipant = function(userId) {
  // ��������� ������ ������� ID �����������
  const possibleUserIds = [
    userId.toString(),
    `php_${userId}`,
    userId.startsWith('php_') ? userId : null
  ].filter(Boolean);
  
  return this.participants.some(p => possibleUserIds.includes(p.userId.toString()));
};

// ����� ��� ��������� ��������
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

// ����� ��� ��������� ��������
chatSchema.methods.removeParticipant = function(userId) {
  // ��������� ������ ������� ID �����������
  const possibleUserIds = [
    userId.toString(),
    `php_${userId}`,
    userId.startsWith('php_') ? userId : null
  ].filter(Boolean);
  
  this.participants = this.participants.filter(p => !possibleUserIds.includes(p.userId.toString()));
  return this;
};

// ����� ��� ��������� ����� ���� ��� ��������� ����
chatSchema.methods.getChatName = function(currentUserId) {
  if (this.type === 'group') {
    return this.name || 'Group Chat';
  }
  
  // ��������� ������ ������� ID ��������� �����������
  const possibleCurrentUserIds = [
    currentUserId.toString(),
    `php_${currentUserId}`,
    currentUserId.startsWith('php_') ? currentUserId : null
  ].filter(Boolean);
  
  // ��� ��������� ���� ��������� ��'� ������ �����������
  const otherParticipant = this.participants.find(p => !possibleCurrentUserIds.includes(p.userId.toString()));
  return otherParticipant ? otherParticipant.username : 'Unknown User';
};

// ��������� ����� ��� ��������� ���������� ����
chatSchema.statics.createPrivateChat = async function(user1Id, user1Name, user2Id, user2Name) {
  // ���������� �� ��� ���� ��������� ��� �� ���� �������������
  const existingChat = await this.findOne({
    type: 'private',
    'participants.userId': { $all: [user1Id, user2Id] }
  });

  if (existingChat) {
    return existingChat;
  }

  // ��������� ����� ��������� ���
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
