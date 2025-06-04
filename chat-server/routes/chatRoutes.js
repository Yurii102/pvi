const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
// User ������ �������� - ����������� ����������� � MySQL ����� PHP
const { authenticateJWT } = require('../middleware/auth');

// ��������� ��� ���� ��������� ����������� (� JWT)
router.get('/', authenticateJWT, async (req, res) => {
  try {
    console.log('?? GET /api/chats - User:', req.user);
    const userId = req.user.id;
    
    const chats = await Chat.find({
      'participants.userId': userId,
      isActive: true
    })
    .populate('lastMessage')
    .sort({ lastActivity: -1 });

    // ������ ���������� ��� ���������� �����������
    const chatsWithUnread = await Promise.all(chats.map(async (chat) => {
      const unreadCount = await Message.countDocuments({
        chatId: chat._id,
        senderId: { $ne: userId },
        'readBy.userId': { $ne: userId },
        isDeleted: false
      });

      const chatObj = chat.toObject();
      chatObj.unreadCount = unreadCount;
      chatObj.chatName = chat.getChatName(userId);
      
      return chatObj;
    }));

    res.json({
      success: true,
      data: chatsWithUnread
    });
  } catch (error) {
    console.error('Error fetching user chats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chats',
      error: error.message
    });
  }
});

// ��������� ������ ���������� ����
router.post('/private', async (req, res) => {
  try {
    const { user1Id, user1Name, user2Id, user2Name } = req.body;

    if (!user1Id || !user2Id || !user1Name || !user2Name) {
      return res.status(400).json({
        success: false,
        message: 'All user information is required'
      });
    }

    if (user1Id === user2Id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create chat with yourself'
      });
    }

    const chat = await Chat.createPrivateChat(user1Id, user1Name, user2Id, user2Name);

    res.json({
      success: true,
      chat: {
        ...chat.toObject(),
        chatName: chat.getChatName(user1Id)
      }
    });
  } catch (error) {
    console.error('Error creating private chat:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating chat',
      error: error.message
    });
  }
});

// ��������� ��������� ����
router.post('/group', async (req, res) => {
  try {
    const { name, creatorId, creatorName, participantIds, participantNames, description } = req.body;

    if (!name || !creatorId || !creatorName || !participantIds || !participantNames) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing'
      });
    }

    if (participantIds.length !== participantNames.length) {
      return res.status(400).json({
        success: false,
        message: 'Participant IDs and names must match'
      });
    }

    // ��������� ������ ��������
    const participants = [
      { userId: creatorId, username: creatorName, role: 'admin' }
    ];

    participantIds.forEach((id, index) => {
      if (id !== creatorId) {
        participants.push({
          userId: id,
          username: participantNames[index],
          role: 'member'
        });
      }
    });

    const chat = new Chat({
      name,
      type: 'group',
      participants,
      createdBy: creatorId,
      description: description || ''
    });

    const savedChat = await chat.save();

    res.json({
      success: true,
      chat: savedChat
    });
  } catch (error) {
    console.error('Error creating group chat:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating group chat',
      error: error.message
    });
  }
});

// ��������� ���������� ��� ���������� ���
router.get('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.query;

    const chat = await Chat.findById(chatId)
      .populate('participants.userId', 'username firstName lastName avatar status lastSeen')
      .populate('lastMessage');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // ���������� �� � ���������� ��������� ����
    if (userId && !chat.isParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const chatObj = chat.toObject();
    if (userId) {
      chatObj.chatName = chat.getChatName(userId);
    }

    res.json({
      success: true,
      chat: chatObj
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chat',
      error: error.message
    });
  }
});

// ��������� �������� �� ��������� ����
router.post('/:chatId/participants', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId, username, addedBy } = req.body;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (chat.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Can only add participants to group chats'
      });
    }

    // ���������� �� �� ���������� ����� �������� ��������
    const adder = chat.participants.find(p => p.userId.toString() === addedBy);
    if (!adder || adder.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can add participants'
      });
    }

    chat.addParticipant(userId, username);
    await chat.save();

    res.json({
      success: true,
      message: 'Participant added successfully'
    });
  } catch (error) {
    console.error('Error adding participant:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding participant',
      error: error.message
    });
  }
});

// ��������� �������� � ��������� ����
router.delete('/:chatId/participants/:userId', async (req, res) => {
  try {
    const { chatId, userId } = req.params;
    const { removedBy } = req.body;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (chat.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Can only remove participants from group chats'
      });
    }

    // ���������� �����
    const remover = chat.participants.find(p => p.userId.toString() === removedBy);
    if (!remover || (remover.role !== 'admin' && removedBy !== userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    chat.removeParticipant(userId);
    await chat.save();

    res.json({
      success: true,
      message: 'Participant removed successfully'
    });
  } catch (error) {
    console.error('Error removing participant:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing participant',
      error: error.message
    });  }
});

// ��������� ����
router.delete('/:chatId', authenticateJWT, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // ���������� ����� (��� ���������� ���� - ����-���� �������, ��� ��������� - ����� �����������)
    const participant = chat.participants.find(p => p.userId === userId);
    if (!participant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Not a participant of this chat'
      });
    }

    if (chat.type === 'group' && participant.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only admins can delete group chats'
      });
    }

    // ��������� ��� �� ��������� (������ ���������� ��������� � ���� �����)
    chat.isActive = false;
    await chat.save();
    
    // ��������� �� ����������� ���� (��������� �� �������)
    await Message.updateMany({ chatId: chatId }, { isDeleted: true });

    res.json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting chat',
      error: error.message
    });
  }
});

module.exports = router;
