const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },  senderId: {
    type: String, // ������� �� String ��� PHP ������������
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },  readBy: [{
    userId: {
      type: String, // ������� �� String ��� PHP ������������
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String
  }]
}, {
  timestamps: true
});

// ������� ��� ����������
messageSchema.index({ chatId: 1, timestamp: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ timestamp: -1 });

// ³�������� ���� ��� �������� �� ��������� �����������
messageSchema.virtual('isRead').get(function() {
  return this.readBy.length > 0;
});

// ����� ��� ���������� ����������� �� �����������
messageSchema.methods.markAsRead = function(userId) {
  const alreadyRead = this.readBy.some(read => read.userId.toString() === userId.toString());
  
  if (!alreadyRead) {
    this.readBy.push({
      userId,
      readAt: new Date()
    });
  }
  
  return this;
};

// ����� ��� �������� �� �������� ���������� ����������
messageSchema.methods.isReadBy = function(userId) {
  return this.readBy.some(read => read.userId.toString() === userId.toString());
};

// ����� ��� ����������� �����������
messageSchema.methods.editMessage = function(newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this;
};

// ����� ��� ��������� �����������
messageSchema.methods.deleteMessage = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = 'This message was deleted';
  return this;
};

// ��������� ����� ��� ��������� ���������� ���� � ���������
messageSchema.statics.getChatMessages = async function(chatId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return await this.find({ 
    chatId, 
    isDeleted: false 
  })
  .sort({ timestamp: -1 })
  .skip(skip)
  .limit(limit)
  .populate('replyTo', 'content senderName timestamp')
  .lean();
};

// ��������� ����� ��� ��������� ������������ ���������� �����������
messageSchema.statics.getUnreadMessages = async function(userId, chatId = null) {
  const query = {
    senderId: { $ne: userId },
    'readBy.userId': { $ne: userId },
    isDeleted: false
  };
  
  if (chatId) {
    query.chatId = chatId;
  }
  
  return await this.find(query).sort({ timestamp: -1 });
};

module.exports = mongoose.model('Message', messageSchema);
