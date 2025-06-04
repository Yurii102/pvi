const jwt = require('jsonwebtoken');
const axios = require('axios'); // Додаємо axios для HTTP запитів

// Функція для перевірки PHP сесії
const checkPHPSession = async (sessionId) => {
  try {
    const response = await axios.get('http://localhost/studentApp/api/check_auth.php', {
      withCredentials: true,
      headers: {
        'Cookie': `PHPSESSID=${sessionId}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error checking PHP session:', error.message);
    return { success: false, authenticated: false };
  }
};

// Middleware для перевірки PHP сесії
const authenticatePHPSession = async (req, res, next) => {
  try {
    const sessionId = req.cookies?.PHPSESSID || req.headers['x-session-id'];
    
    if (!sessionId) {
      return res.status(401).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    const sessionCheck = await checkPHPSession(sessionId);
    
    if (!sessionCheck.success || !sessionCheck.authenticated) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired PHP session'
      });
    }

    // Додаємо інформацію про користувача до запиту
    req.phpUser = sessionCheck.user;
    next();
  } catch (error) {
    console.error('PHP session authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

// Middleware для перевірки JWT токену (для PHP користувачів)
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Перевіряємо токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production');
    
    console.log('?? JWT Decoded:', decoded);
    
    // Для PHP користувачів не перевіряємо MongoDB, а використовуємо дані з токену
    if (decoded.userId && decoded.userId.startsWith('php_')) {
      // Користувач з PHP сесії - додаємо його дані до запиту
      req.user = {
        id: decoded.userId,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role || 'student',
        source: 'php_session'
      };
      console.log('? PHP User authenticated via JWT:', req.user.username);
      next();
    } else {
      // Якщо це не PHP користувач, повертаємо помилку
      return res.status(401).json({
        success: false,
        message: 'Invalid user type - only PHP users are supported'
      });
    }
  } catch (error) {
    console.error('? Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

// JWT authentication middleware (для PHP користувачів)
const authenticateJWT = async (req, res, next) => {
  try {
    console.log('?? JWT Auth - Headers:', req.headers.authorization ? 'Token present' : 'No token');
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('? JWT Auth - No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Верифікуємо JWT токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production');
    console.log('?? JWT Auth - Token decoded:', { userId: decoded.userId, username: decoded.username });
    
    // Для PHP користувачів не шукаємо в MongoDB, а використовуємо дані з токену
    if (decoded.userId && decoded.userId.startsWith('php_')) {
      console.log('? JWT Auth - PHP User authenticated:', decoded.username);
      req.user = {
        id: decoded.userId,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role || 'student',
        source: 'php_session'
      };
      next();
    } else {
      console.log('? JWT Auth - Invalid user type:', decoded.userId);
      return res.status(401).json({
        success: false,
        message: 'Invalid user type - only PHP users are supported'
      });
    }
  } catch (error) {
    console.error('? JWT authentication error:', error.message);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Middleware для перевірки ролі користувача
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Middleware для опціональної аутентифікації (не обов'язкова)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // При опціональній аутентифікації ігноруємо помилки
    next();
  }
};

// Middleware для валідації даних чату
const validateChatAccess = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const userId = req.user ? req.user._id : req.body.userId || req.query.userId;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID is required'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const Chat = require('../models/Chat');
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (!chat.isParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    req.chat = chat;
    req.userId = userId;
    next();
  } catch (error) {
    console.error('Chat access validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating chat access',
      error: error.message
    });
  }
};

// Middleware для обробки помилок
const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
};

module.exports = {
  authenticateToken,
  authenticateJWT,
  requireRole,
  optionalAuth,
  validateChatAccess,
  errorHandler,
  authenticatePHPSession
};
