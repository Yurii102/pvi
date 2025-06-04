// Chat Application JavaScript
class ChatApp {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentChat = null;
        this.chats = [];
        this.users = new Map();
        this.typingTimeout = null;
        
        this.init();
    }

    // Function to get cookie value
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    async init() {
        try {
            // Check authentication
            await this.checkAuth();
            
            // Initialize Socket.IO
            this.initSocket();
            
            // Load chats
            await this.loadChats();
            
            // Setup event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Failed to initialize chat:', error);
            this.showError('Failed to initialize chat application');
        }
    }

    async checkAuth() {
        try {
            console.log('?? Checking authentication...');
            
            // Get PHPSESSID from cookies
            const sessionId = this.getCookie('PHPSESSID');
            console.log('?? PHP Session ID:', sessionId);
            
            if (!sessionId) {
                throw new Error('No PHP session found');
            }

            const response = await fetch('http://localhost:3001/api/auth/status', {
                credentials: 'include',
                headers: {
                    'X-Session-ID': sessionId
                }
            });
            
            console.log('?? Auth status response:', response.status);
            const result = await response.json();
            console.log('?? Auth result:', result);
            
            if (!result.success || !result.authenticated) {
                throw new Error('Not authenticated');
            }
            
            // Get JWT token
            console.log('??? Getting JWT token...');
            const tokenResponse = await fetch('http://localhost:3001/api/auth/php-token', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-Session-ID': sessionId
                }
            });
            
            console.log('?? Token response:', tokenResponse.status);
            const tokenResult = await tokenResponse.json();
            console.log('??? Token result:', tokenResult);
            
            if (!tokenResult.success) {
                throw new Error('Failed to get authentication token');
            }
            
            this.currentUser = tokenResult.user;
            this.authToken = tokenResult.token;
            
            console.log('Authenticated as:', this.currentUser.username);
            
        } catch (error) {
            console.error('Authentication failed:', error);
            // Redirect to login page
            window.location.href = './index.php';
            throw error;
        }
    }

    initSocket() {
        this.socket = io('http://localhost:3001', {
            auth: {
                token: this.authToken
            }
        });

        this.socket.on('connect', () => {
            console.log('Connected to chat server');
            
            // Join the system
            this.socket.emit('user_join', {
                userId: this.currentUser.id,
                username: this.currentUser.username
            });
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from chat server');
        });

        // Handle new messages
        this.socket.on('new_message', (message) => {
            this.handleNewMessage(message);
        });

        // Handle user status
        this.socket.on('user_status_change', (data) => {
            this.handleUserStatusChange(data);
        });

        // Handle typing indicators
        this.socket.on('user_typing', (data) => {
            this.handleUserTyping(data);
        });

        this.socket.on('user_stop_typing', (data) => {
            this.handleUserStopTyping(data);
        });
    }

    async loadChats() {
        try {
            console.log('?? Loading chats with token:', this.authToken ? 'Token present' : 'No token');
            const response = await fetch('http://localhost:3001/api/chats', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            console.log('?? Response status:', response.status);
            console.log('?? Response headers:', response.headers.get('content-type'));
            
            const responseText = await response.text();
            console.log('?? Response text:', responseText.substring(0, 200));
            
            const result = JSON.parse(responseText);
            
            if (result.success) {
                this.chats = result.data;
                this.renderChatList();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to load chats:', error);
            this.showError('Failed to load conversations');
        }
    }

    renderChatList() {
        const chatList = document.getElementById('chatList');
        
        if (this.chats.length === 0) {
            chatList.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">chat</span>
                    <div style="margin-top: 10px;">No conversations yet</div>
                    <div style="font-size: 0.8rem; margin-top: 5px; color: rgba(255,255,255,0.7);">Click "New Chat" to start messaging</div>
                </div>
            `;
            return;
        }

        chatList.innerHTML = this.chats.map(chat => {
            const lastMessage = chat.lastMessage;
            const otherParticipant = chat.participants.find(p => p._id !== this.currentUser.id);
            const unreadCount = chat.unreadCount || 0;
            
            return `
                <div class="chat-item" data-chat-id="${chat._id}" onclick="chatApp.selectChat('${chat._id}')">
                    <div class="chat-avatar">
                        ${(chat.name || otherParticipant?.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div class="chat-content">
                        <div class="chat-name">${chat.name || otherParticipant?.username || 'Unknown'}</div>
                        <div class="chat-preview">${lastMessage ? lastMessage.content : 'No messages yet'}</div>
                    </div>
                    <div class="chat-meta">
                        <div class="chat-time">${lastMessage ? this.formatTime(lastMessage.createdAt) : ''}</div>
                        ${unreadCount > 0 ? `<div class="unread-badge">${unreadCount}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async selectChat(chatId) {
        try {
            // Update UI
            document.querySelectorAll('.chat-item').forEach(item => {
                item.classList.remove('active');
            });
            const selectedItem = document.querySelector(`[data-chat-id="${chatId}"]`);
            if (selectedItem) {
                selectedItem.classList.add('active');
            }

            // Load messages
            const response = await fetch(`http://localhost:3001/api/messages/${chatId}`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentChat = this.chats.find(c => c._id === chatId);
                this.renderChatHeader();
                this.renderMessages(result.data);
                
                // Show chat interface
                document.getElementById('chatHeader').style.display = 'block';
                document.getElementById('messageInputContainer').style.display = 'block';
                
                // Join chat room
                this.socket.emit('join_chat', chatId);
                
                // Mark messages as read
                this.markAsRead(chatId);
                
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to select chat:', error);
            this.showError('Failed to load conversation');
        }
    }

    renderChatHeader() {
        if (!this.currentChat) return;
        
        const otherParticipant = this.currentChat.participants.find(p => p._id !== this.currentUser.id);
        const chatTitle = document.getElementById('chatTitle');
        const chatStatus = document.getElementById('chatStatus');
        
        chatTitle.textContent = this.currentChat.name || otherParticipant?.username || 'Unknown';
        
        // Show user status
        if (otherParticipant) {
            const isOnline = this.users.get(otherParticipant._id)?.status === 'online';
            chatStatus.innerHTML = `
                <span class="${isOnline ? 'online' : 'offline'}-indicator"></span>
                ${isOnline ? 'Online' : 'Offline'}
            `;
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messagesContainer');
        
        if (messages.length === 0) {
            container.innerHTML = `
                <div class="empty-chat">
                    <span class="material-icons">chat_bubble_outline</span>
                    <div>No messages yet</div>
                    <div style="font-size: 0.9rem; margin-top: 5px; color: #999;">Start the conversation!</div>
                </div>
            `;
            return;
        }

        container.innerHTML = messages.map(message => {
            const isOwn = message.sender._id === this.currentUser.id;
            const senderInitials = message.sender.username.charAt(0).toUpperCase();
            
            return `
                <div class="message ${isOwn ? 'own' : ''}">
                    <div class="message-avatar">${senderInitials}</div>
                    <div class="message-content">
                        <div class="message-text">${this.escapeHtml(message.content)}</div>
                        <div class="message-time">${this.formatTime(message.createdAt)}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    setupEventListeners() {
        // Message form submission
        document.getElementById('messageForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Auto-expand textarea
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
            
            // Typing indicator
            this.handleTyping();
        });

        // Chat search
        document.getElementById('chatSearch').addEventListener('input', (e) => {
            this.searchChats(e.target.value);
        });

        // New conversation
        document.getElementById('newChatBtn').addEventListener('click', () => {
            this.showNewChatDialog();
        });
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        
        if (!content || !this.currentChat) return;

        try {
            const response = await fetch('http://localhost:3001/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    chatId: this.currentChat._id,
                    content: content
                })
            });

            const result = await response.json();
            
            if (result.success) {
                input.value = '';
                input.style.height = 'auto';
                
                // Message will be added via Socket.IO event
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            this.showError('Failed to send message');
        }
    }

    handleNewMessage(message) {
        // If message is for current chat
        if (this.currentChat && message.chat === this.currentChat._id) {
            this.addMessageToUI(message);
        }
        
        // Update chat list
        this.updateChatInList(message);
    }

    addMessageToUI(message) {
        const container = document.getElementById('messagesContainer');
        const isOwn = message.sender._id === this.currentUser.id;
        const senderInitials = message.sender.username.charAt(0).toUpperCase();
        
        // Remove empty state if present
        const emptyChat = container.querySelector('.empty-chat');
        if (emptyChat) emptyChat.remove();
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isOwn ? 'own' : ''}`;
        messageElement.innerHTML = `
            <div class="message-avatar">${senderInitials}</div>
            <div class="message-content">
                <div class="message-text">${this.escapeHtml(message.content)}</div>
                <div class="message-time">${this.formatTime(message.createdAt)}</div>
            </div>
        `;
        
        container.appendChild(messageElement);
        container.scrollTop = container.scrollHeight;
    }

    updateChatInList(message) {
        // Find chat in list and update it
        const chatIndex = this.chats.findIndex(c => c._id === message.chat);
        if (chatIndex !== -1) {
            this.chats[chatIndex].lastMessage = message;
            // Move chat to top of list
            const chat = this.chats.splice(chatIndex, 1)[0];
            this.chats.unshift(chat);
            this.renderChatList();
        }
    }

    handleTyping() {
        if (!this.currentChat) return;
        
        this.socket.emit('typing', {
            chatId: this.currentChat._id,
            userId: this.currentUser.id
        });
        
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.socket.emit('stop_typing', {
                chatId: this.currentChat._id,
                userId: this.currentUser.id
            });
        }, 1000);
    }

    handleUserStatusChange(data) {
        this.users.set(data.userId, { status: data.status });
        
        // Update current chat header if affected
        if (this.currentChat) {
            const otherParticipant = this.currentChat.participants.find(p => p._id !== this.currentUser.id);
            if (otherParticipant && otherParticipant._id === data.userId) {
                this.renderChatHeader();
            }
        }
    }

    handleUserTyping(data) {
        if (this.currentChat && data.chatId === this.currentChat._id && data.userId !== this.currentUser.id) {
            const typingIndicator = document.getElementById('typingIndicator');
            typingIndicator.textContent = `${data.username} is typing...`;
            typingIndicator.style.display = 'block';
        }
    }

    handleUserStopTyping(data) {
        if (this.currentChat && data.chatId === this.currentChat._id) {
            document.getElementById('typingIndicator').style.display = 'none';
        }
    }

    async markAsRead(chatId) {
        try {
            await fetch(`http://localhost:3001/api/messages/${chatId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
        } catch (error) {
            console.error('Failed to mark messages as read:', error);
        }
    }

    searchChats(query) {
        const items = document.querySelectorAll('.chat-item');
        items.forEach(item => {
            const name = item.querySelector('.chat-name').textContent.toLowerCase();
            const preview = item.querySelector('.chat-preview').textContent.toLowerCase();
            const matches = name.includes(query.toLowerCase()) || preview.includes(query.toLowerCase());
            item.style.display = matches ? 'block' : 'none';
        });
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    showNewChatDialog() {
        // Here we can add a modal dialog for creating new chats
        const username = prompt('Enter username to start a chat:');
        if (username) {
            this.createNewChat(username);
        }
    }

    async createNewChat(username) {
        try {
            const response = await fetch('http://localhost:3001/api/chats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    type: 'private',
                    participants: [username]
                })
            });

            const result = await response.json();
            
            if (result.success) {
                await this.loadChats();
                this.selectChat(result.data._id);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to create chat:', error);
            this.showError('Failed to create conversation');
        }
    }
}

// Initialize chat after page load
let chatApp;
document.addEventListener('DOMContentLoaded', () => {
    chatApp = new ChatApp();
});
