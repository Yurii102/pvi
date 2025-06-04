const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Chat = require('../models/Chat');

// ��������� ������������ ���������� ��� �����������
router.get('/unread/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { username } = req.query;
    console.log(`?? Getting unread messages for user: ${userId}, username: ${username}`);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // ��������� ������ ������� ID �����������
    const possibleUserIds = [
      userId.toString(),
      `php_${userId}`,
      userId.startsWith('php_') ? userId : null
    ].filter(Boolean);

    // ���� � username, ������ ����� php_username ������
    if (username) {
      possibleUserIds.push(`php_${username}`);
    }

    console.log(`?? Searching for user with IDs: ${possibleUserIds.join(', ')}`);

    // �������� �� ����, � ���� ���������� � ��������� (������ �� ��� �������� ID)
    const userChats = await Chat.find({
      'participants.userId': { $in: possibleUserIds },
      isActive: true
    });

    console.log(`?? Found ${userChats.length} chats for user ${userId}`);

    const notifications = [];
    let totalUnreadCount = 0;    for (const chat of userChats) {
      console.log(`?? Processing chat: ${chat._id}, type: ${chat.type}`);
      
      // ��������� ���������� ��� ��������� ����������� � ��� (� ����������� ����� ������� ID)
      const currentParticipant = chat.participants.find(p => possibleUserIds.includes(p.userId));
      console.log(`?? Current participant:`, currentParticipant);
      
      // �������� ���������� ����������� � ����� ���
      let messageFilter = {
        chatId: chat._id,
        senderId: { $nin: possibleUserIds }, // �� ���� �����������
        isDeleted: false,
        'readBy.userId': { $nin: possibleUserIds } // �� �� �������� ����
      };

      console.log(`?? Base message filter:`, messageFilter);

      // ���� � lastReadMessage, �� ������ ����� ��� ����������� ���� �����
      if (currentParticipant?.lastReadMessage) {
        const lastReadMessage = await Message.findById(currentParticipant.lastReadMessage);
        if (lastReadMessage?.timestamp) {
          messageFilter.timestamp = { $gt: lastReadMessage.timestamp };
          console.log(`?? Added timestamp filter after: ${lastReadMessage.timestamp}`);
        }
      }

      console.log(`?? Final message filter:`, messageFilter);

      const unreadMessages = await Message.find(messageFilter)
        .sort({ timestamp: -1 })
        .limit(10);

      console.log(`?? Found ${unreadMessages.length} unread messages in chat ${chat._id}`);

      if (unreadMessages.length > 0) {
        // �������� ������ ����������� ����������� ��� ���������
        const lastUnreadMessage = unreadMessages[0];
          // ��������� ����� ����
        let chatName = '';
        if (chat.type === 'private') {
          // ��� ���������� ���� ��������� ��'� ������ ��������
          const otherParticipant = chat.participants.find(p => !possibleUserIds.includes(p.userId));
          chatName = otherParticipant?.username || 'Unknown User';
        } else {
          chatName = chat.name || 'Group Chat';
        }

        notifications.push({
          id: `${chat._id}_${lastUnreadMessage._id}`,
          chatId: chat._id.toString(),
          chatName: chatName,
          senderName: lastUnreadMessage.senderName,
          content: lastUnreadMessage.content.substring(0, 100) + 
                   (lastUnreadMessage.content.length > 100 ? '...' : ''),
          timestamp: lastUnreadMessage.timestamp.toISOString(),
          unreadCount: unreadMessages.length,
          messageId: lastUnreadMessage._id.toString()
        });

        totalUnreadCount += unreadMessages.length;
      }
    }

    // ������� ��������� �� ����� (�������� ��������)
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      notifications,
      count: totalUnreadCount,
      userId
    });
  } catch (error) {
    console.error('Error fetching unread messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread messages',
      error: error.message,
      notifications: [],
      count: 0
    });
  }
});

// ��������� ���������� ���� � ���������
router.get('/chat/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50, userId } = req.query;

    // ���������� �� ���� ��� � �� �� ���������� ������
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (userId && !chat.isParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const messages = await Message.getChatMessages(chatId, parseInt(page), parseInt(limit));
    
    // ��������� ������� ��� ����������� ����������� (������ ����������� ��������)
    const reversedMessages = messages.reverse();

    // �������� �������� ������� ���������� ��� ��������
    const totalMessages = await Message.countDocuments({ 
      chatId, 
      isDeleted: false 
    });

    const totalPages = Math.ceil(totalMessages / parseInt(limit));

    res.json({
      success: true,
      messages: reversedMessages,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalMessages,
        hasMore: parseInt(page) < totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: error.message
    });
  }
});

// ���������� ������ ����������� (����� REST API �� ������������ Socket.IO)
router.post('/', async (req, res) => {
  try {
    const { chatId, senderId, senderName, content, messageType = 'text', replyTo } = req.body;

    if (!chatId || !senderId || !senderName || !content) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing'
      });
    }

    // ���������� �� ���� ��� � �� �� ���������� ������
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (!chat.isParticipant(senderId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const newMessage = new Message({
      chatId,
      senderId,
      senderName,
      content,
      messageType,
      replyTo: replyTo || null
    });

    const savedMessage = await newMessage.save();

    // ��������� ������ ����������� � ���
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: savedMessage._id,
      lastActivity: new Date()
    });

    // ���������� reply ���� �
    const populatedMessage = await Message.findById(savedMessage._id)
      .populate('replyTo', 'content senderName timestamp');

    res.json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message
    });
  }
});

// ���������� ����������� �� �����������
router.put('/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // ��������� ������ ������� ID �����������
    const possibleUserIds = [
      userId.toString(),
      `php_${userId}`,
      userId.startsWith('php_') ? userId : null
    ].filter(Boolean);

    console.log(`?? Marking message ${messageId} as read for user IDs: ${possibleUserIds.join(', ')}`);

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // ��������� �� ��������� ��� ��������� ����������� ID
    message.markAsRead(userId);
    await message.save();

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking message as read',
      error: error.message
    });
  }
});

// ���������� ��� ���������� ���� �� ����������
router.put('/chat/:chatId/read-all', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // ��������� ������ ������� ID �����������
    const possibleUserIds = [
      userId.toString(),
      `php_${userId}`,
      userId.startsWith('php_') ? userId : null
    ].filter(Boolean);

    console.log(`?? Marking all messages in chat ${chatId} as read for user IDs: ${possibleUserIds.join(', ')}`);

    // �������� �� ���������� ����������� ����������� � ����� ���
    const unreadMessages = await Message.find({
      chatId,
      senderId: { $nin: possibleUserIds }, // �� ���� �����������
      'readBy.userId': { $nin: possibleUserIds }, // �� �� �������� ����
      isDeleted: false
    });

    console.log(`?? Found ${unreadMessages.length} unread messages to mark as read`);

    // ��������� �� �� ��������
    for (const message of unreadMessages) {
      message.markAsRead(userId);
      await message.save();
    }

    res.json({
      success: true,
      message: `${unreadMessages.length} messages marked as read`
    });
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking messages as read',
      error: error.message
    });
  }
});

// ����������� �����������
router.put('/:messageId/edit', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, userId } = req.body;

    if (!content || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Content and user ID are required'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // ���������� �� ���� ���������� ���������� �� �����������
    if (message.senderId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Can only edit your own messages'
      });
    }

    // ���������� �� �� ������� ����������� (����� ���������� �������� 15 ������)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.timestamp < fifteenMinutesAgo) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit messages older than 15 minutes'
      });
    }

    message.editMessage(content);
    await message.save();

    res.json({
      success: true,
      message: message
    });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({
      success: false,
      message: 'Error editing message',
      error: error.message
    });
  }
});

// ��������� �����������
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // ���������� �� ���� ���������� �������� �� �����������
    if (message.senderId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Can only delete your own messages'
      });
    }

    message.deleteMessage();
    await message.save();

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
      error: error.message
    });
  }
});

// ��������� ������������ ���������� �����������
router.get('/unread/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { chatId } = req.query;

    const unreadMessages = await Message.getUnreadMessages(userId, chatId);

    // ������� �� ������
    const unreadByChat = {};
    unreadMessages.forEach(message => {
      const chatId = message.chatId.toString();
      if (!unreadByChat[chatId]) {
        unreadByChat[chatId] = [];
      }
      unreadByChat[chatId].push(message);
    });

    res.json({
      success: true,
      unreadMessages: unreadByChat,    totalUnread: unreadMessages.length
    });
  } catch (error) {
    console.error('Error fetching unread messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread messages',
      error: error.message
    });
  }
});

// ���������� ���������� �� ����������
router.post('/mark-read', async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    if (!chatId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID and User ID are required'
      });
    }

    // ��������� ������ ������� ID �����������
    const possibleUserIds = [
      userId.toString(),
      `php_${userId}`,
      userId.startsWith('php_') ? userId : null
    ].filter(Boolean);

    console.log(`?? Marking messages in chat ${chatId} as read for user IDs: ${possibleUserIds.join(', ')}`);

    // ���������� �� ���� ��� � �� � ���������� ���������
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // ���������� ������ ����������� � ��� (� ����������� ����� ������� ID)
    const isParticipant = chat.participants.some(p => possibleUserIds.includes(p.userId));
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // �������� �� ���������� ����������� ����������� � ����� ���
    const unreadMessages = await Message.find({
      chatId,
      senderId: { $nin: possibleUserIds }, // �� ���� �����������
      'readBy.userId': { $nin: possibleUserIds }, // �� �� �������� ����
      isDeleted: false
    });

    let markedCount = 0;
    let lastMessageId = null;

    console.log(`?? Found ${unreadMessages.length} unread messages to mark as read`);

    // ��������� ����� ����������� �� ���������
    for (const message of unreadMessages) {
      message.markAsRead(userId);
      await message.save();
      markedCount++;
      lastMessageId = message._id;
    }

    // ��������� lastReadMessage ��� ����������� � ��� (��� ����-����� � ������� ID)
    if (lastMessageId) {
      for (const possibleId of possibleUserIds) {
        await Chat.updateOne(
          {
            _id: chatId,
            'participants.userId': possibleId
          },
          {
            $set: {
              'participants.$.lastReadMessage': lastMessageId
            }
          }
        );
      }
    }

    res.json({
      success: true,
      message: `Marked ${markedCount} messages as read`,
      markedCount,
      chatId
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking messages as read',
      error: error.message
    });
  }
});

module.exports = router;
