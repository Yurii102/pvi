# Student Chat System

Real-time chat system integrated with the existing Student Management application. Built with Node.js, Socket.IO, and MongoDB for real-time messaging while maintaining PHP authentication with MySQL.

## ?? Features

### Real-time Communication
- ? Instant messaging with Socket.IO
- ?? Private conversations between students
- ?? Real-time typing indicators
- ? Message read receipts
- ?? Online/offline status tracking

### Integration
- ?? Seamless PHP session authentication
- ?? Automatic user synchronization from MySQL
- ?? Mobile-responsive chat interface
- ?? Real-time notifications

### Security
- ??? JWT token authentication
- ?? Session-based access control
- ? Authentication required for all chat features

## ?? Quick Start

### Prerequisites
- **XAMPP** with Apache and MySQL running
- **Node.js** (v14 or higher) 
- **MongoDB** installed and running locally

### Installation

1. **Install Dependencies**
   ```bash
   cd chat-server
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update database connection and other settings

4. Start MongoDB service

5. Run the server:
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Chats
- `GET /api/chats/user/:userId` - Get user's chats
- `POST /api/chats/private` - Create private chat
- `POST /api/chats/group` - Create group chat
- `GET /api/chats/:chatId` - Get chat details

### Messages
- `GET /api/messages/chat/:chatId` - Get chat messages
- `POST /api/messages` - Send message (REST alternative)
- `PUT /api/messages/:messageId/read` - Mark message as read
- `PUT /api/messages/chat/:chatId/read-all` - Mark all messages as read

### Users
- `GET /api/users` - Get users list
- `GET /api/users/:userId` - Get user profile
- `PUT /api/users/:userId/status` - Update user status
- `GET /api/users/search/:query` - Search users

## Socket.IO Events

### Client to Server
- `user_join` - User joins the system
- `join_chat` - Join specific chat
- `leave_chat` - Leave chat
- `send_message` - Send message
- `typing_start` - Start typing
- `typing_stop` - Stop typing

### Server to Client
- `new_message` - New message received
- `user_status_change` - User status changed
- `user_typing` - User typing status
- `message_error` - Message sending error

## Environment Variables

- `PORT` - Server port (default: 3001)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT secret key
- `FRONTEND_URL` - Frontend URL for CORS

## Server Status

Access `http://localhost:3001` to check server status.
