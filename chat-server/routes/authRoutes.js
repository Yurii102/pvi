const express = require('express');
const router = express.Router();
const axios = require('axios');
const { generateToken } = require('../utils/helpers');

// Отримання JWT токену на основі PHP сесії
router.post('/php-token', async (req, res) => {  try {
    console.log('?? PHP Token Request - Cookies:', req.cookies);
    console.log('?? PHP Token Request - Headers:', req.headers['x-session-id']);
    const sessionId = req.cookies?.PHPSESSID || req.headers['x-session-id'];
    
    if (!sessionId) {
      console.log('? No PHP session ID found');
      return res.status(401).json({
        success: false,
        message: 'PHP session ID required'
      });
    }

    console.log('?? Checking PHP session:', sessionId);
    // Перевіряємо PHP сесію
    const phpAuthResponse = await axios.get('http://localhost/studentApp/api/check_auth.php', {
      headers: {
        'Cookie': `PHPSESSID=${sessionId}`
      }
    });

    console.log('?? PHP Auth Response:', phpAuthResponse.data);

    if (!phpAuthResponse.data.success || !phpAuthResponse.data.authenticated) {
      console.log('? PHP session invalid or not authenticated');
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired PHP session'
      });
    }

    const phpUser = phpAuthResponse.data.user;
    console.log('? PHP User found:', phpUser.username);
    
    // Генеруємо JWT токен
    const userId = `php_${phpUser.username}`;
    const token = generateToken(userId, phpUser.username, `${phpUser.username}@student.local`, 'student');

    console.log('??? JWT Token generated for user:', phpUser.username);

    res.json({
      success: true,
      token,
      user: {
        id: userId,
        username: phpUser.username,
        email: `${phpUser.username}@student.local`,
        role: 'student',
        source: 'php_session'
      }
    });

  } catch (error) {
    console.error('Error generating PHP token:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing PHP authentication',
      error: error.message
    });
  }
});

// Перевірка статусу автентифікації
router.get('/status', async (req, res) => {
  try {
    const sessionId = req.cookies?.PHPSESSID || req.headers['x-session-id'];
    
    if (!sessionId) {
      return res.json({
        success: true,
        authenticated: false,
        source: 'no_session'
      });
    }

    // Перевіряємо PHP сесію
    const phpAuthResponse = await axios.get('http://localhost/studentApp/api/check_auth.php', {
      headers: {
        'Cookie': `PHPSESSID=${sessionId}`
      }
    });

    if (phpAuthResponse.data.success && phpAuthResponse.data.authenticated) {
      const phpUser = phpAuthResponse.data.user;
      
      res.json({
        success: true,
        authenticated: true,
        user: {
          username: phpUser.username,
          sessionId: phpUser.sessionId
        },
        source: 'php_session'
      });
    } else {
      res.json({
        success: true,
        authenticated: false,
        source: 'invalid_session'
      });
    }

  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking authentication status',
      error: error.message
    });
  }
});

// Вихід з системи (очищення сесії)
router.post('/logout', (req, res) => {
  // Очищаємо cookie
  res.clearCookie('PHPSESSID');
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
