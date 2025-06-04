const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ��������� JWT ������
const generateToken = (userId, username, email, role = 'student') => {
  const payload = {
    userId,
    username,
    email,
    role
  };

  const options = {
    expiresIn: process.env.JWT_EXPIRE || '7d',
    issuer: 'student-chat-server'
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production', options);
};

// �������� JWT ������
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production');
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// ��������� ������
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// �������� ������
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// ��������� ����������� ID ��� �������� �����
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// ������������ ���� ��� �����������
const formatDate = (date) => {
  const now = new Date();
  const messageDate = new Date(date);
  const diffInMs = now - messageDate;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return '�����';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} �� ����`;
  } else if (diffInHours < 24) {
    return `${diffInHours} ��� ����`;
  } else if (diffInDays === 1) {
    return '�����';
  } else if (diffInDays < 7) {
    return `${diffInDays} �� ����`;
  } else {
    return messageDate.toLocaleDateString('uk-UA');
  }
};

// �������� email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// �������� ������
const isValidPassword = (password) => {
  // ̳���� 6 �������, �� ������ ����� �� �����
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;
  return passwordRegex.test(password);
};

// �������� HTML ���� � ������
const stripHtml = (html) => {
  return html.replace(/<[^>]*>?/gm, '');
};

// �������� ������
const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
};

// �������� �� � ����� ������� ObjectId ��� MongoDB
const isValidObjectId = (id) => {
  const mongoose = require('mongoose');
  return mongoose.Types.ObjectId.isValid(id);
};

// ��������� ������ API
const createResponse = (success, message, data = null, error = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  if (error !== null) {
    response.error = error;
  }

  return response;
};

// ��������
const paginate = (page, limit) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  return {
    page: pageNum,
    limit: limitNum,
    skip
  };
};

// ��������� meta ���������� ��� ��������
const createPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  generateId,
  formatDate,
  isValidEmail,
  isValidPassword,
  stripHtml,
  truncateText,
  isValidObjectId,
  createResponse,
  paginate,
  createPaginationMeta
};
