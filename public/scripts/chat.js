/**
 * Chat Application - Modern Real-time Messaging
 * Separate JavaScript file for chat functionality
 */

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

    // Функція для отримання значення cookie
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    async init() {
        try {
            // Перевіряємо аутентифікацію
            await this.checkAuth();
            
            // Ініціалізуємо Socket.IO
            this.initSocket();
            
            // Завантажуємо чати
            await this.loadChats();
            
            // Встановлюємо обробники подій
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Failed to initialize chat:', error);
            this.showError('Failed to initialize chat application');
        }
    }

    async checkAuth() {
        try {
            console.log('?? Checking authentication...');
            
            // Отримуємо PHPSESSID з cookies
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
            
            // Отримуємо JWT токен
            console.log('?? Getting JWT token...');
            const tokenResponse = await fetch('http://localhost:3001/api/auth/php-token', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-Session-ID': sessionId
                }
            });
            
            console.log('?? Token response:', tokenResponse.status);
            const tokenResult = await tokenResponse.json();
            console.log('?? Token result:', tokenResult);
            
            if (!tokenResult.success) {
                throw new Error('Failed to get authentication token');
            }
            
            this.currentUser = tokenResult.user;
            this.authToken = tokenResult.token;
            
            console.log('? Authenticated as:', this.currentUser.username);
            
        } catch (error) {
            console.error('? Authentication failed:', error);
            // Перенаправляємо на сторінку входу
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
            console.log('?? Connected to chat server');
            
            // Приєднуємося до системи
            this.socket.emit('user_join', {
                userId: this.currentUser.id,
                username: this.currentUser.username
            });
        });

        this.socket.on('disconnect', () => {
            console.log('?? Disconnected from chat server');
        });        // Обробка нових повідомлень
        this.socket.on('new_message', (message) => {
            this.handleNewMessage(message);
        });

        // Обробка статусу користувачів
        this.socket.on('user_status_change', (data) => {
            this.handleUserStatusChange(data);
        });

        // Обробка індикатора набору
        this.socket.on('user_typing', (data) => {
            this.handleUserTyping(data);
        });

        // Обробка припинення набору
        this.socket.on('user_stop_typing', (data) => {
            this.handleUserStopTyping(data);
        });

        // Обробка підтвердження відправки повідомлення
        this.socket.on('message_sent', (data) => {
            console.log('? Message sent confirmation:', data);
        });

        // Обробка помилок повідомлень
        this.socket.on('message_error', (error) => {
            console.error('? Message error:', error);
            this.showError(`Failed to send message: ${error.error}`);
        });

        // Обробка приєднання користувачів до чату
        this.socket.on('user_joined_chat', (data) => {
            console.log(`?? ${data.username} joined the chat`);
        });

        // Обробка від'єднання користувачів від чату
        this.socket.on('user_left_chat', (data) => {
            console.log(`?? ${data.username} left the chat`);
        });

        // Обробка прочитання повідомлень
        this.socket.on('messages_read', (data) => {
            console.log(`?? User ${data.userId} read ${data.readCount} messages in chat ${data.chatId}`);
            // Оновлюємо UI для показу статусу прочитання
            this.updateMessageReadStatus(data);
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
            console.error('? Failed to load chats:', error);
            this.showError('Failed to load conversations');
        }
    }    renderChatList() {
        const chatList = document.getElementById('chatList');
        
        if (this.chats.length === 0) {
            chatList.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">chat</span>
                    <div class="empty-title">No conversations yet</div>
                    <div class="empty-subtitle">Click "New Chat" to start messaging</div>
                </div>
            `;
            return;
        }

        chatList.innerHTML = this.chats.map(chat => {
            const lastMessage = chat.lastMessage;
            const unreadCount = chat.unreadCount || 0;
            
            let chatName, chatAvatar, isOnline = false;
            
            if (chat.type === 'private') {
                // Приватний чат - знаходимо іншого учасника
                const otherParticipant = chat.participants.find(p => p.userId !== this.currentUser.id);
                chatName = otherParticipant?.username || 'Unknown User';
                chatAvatar = chatName.charAt(0).toUpperCase();
                isOnline = this.users.get(otherParticipant?.userId)?.status === 'online';
            } else {
                // Груповий чат
                chatName = chat.name || 'Group Chat';
                chatAvatar = `<span class="material-icons">group</span>`;
                isOnline = chat.participants.some(p => 
                    p.userId !== this.currentUser.id && 
                    this.users.get(p.userId)?.status === 'online'
                );
            }
            
            return `
                <div class="chat-item ${chat._id === this.currentChat?._id ? 'active' : ''}" 
                     data-chat-id="${chat._id}" 
                     onclick="chatApp.selectChat('${chat._id}')">
                    <div class="chat-avatar ${isOnline ? 'online' : 'offline'}">
                        ${typeof chatAvatar === 'string' && chatAvatar.includes('material-icons') ? 
                          chatAvatar : 
                          `<span class="avatar-text">${chatAvatar}</span>`}
                        ${isOnline ? '<span class="online-dot"></span>' : ''}
                    </div>
                    <div class="chat-content">
                        <div class="chat-header-row">
                            <div class="chat-name">${chatName}</div>
                            <div class="chat-time">${lastMessage ? this.formatTime(lastMessage.createdAt) : ''}</div>
                        </div>
                        <div class="chat-preview-row">
                            <div class="chat-preview">${lastMessage ? 
                                (lastMessage.senderId === this.currentUser.id ? 'You: ' : '') + 
                                this.truncateMessage(lastMessage.content, 40) : 
                                'No messages yet'}</div>
                            ${unreadCount > 0 ? `<div class="unread-badge">${unreadCount}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }    async selectChat(chatId) {
        try {
            // Оновлюємо UI
            document.querySelectorAll('.chat-item').forEach(item => {
                item.classList.remove('active');
            });
            
            const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
            if (chatItem) {
                chatItem.classList.add('active');
            }

            // Завантажуємо повідомлення через API
            const response = await fetch(`http://localhost:3001/api/messages/chat/${chatId}?userId=${this.currentUser.id}`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });            
            const result = await response.json();
            
            if (result.success) {
                this.currentChat = this.chats.find(c => c._id === chatId);
                if (!this.currentChat) {
                    throw new Error('Chat not found in local cache');
                }
                
                // Update URL to include chat ID for direct linking
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('chat', chatId);
                window.history.replaceState({}, '', currentUrl.toString());
                
                this.renderChatHeader();
                
                // Перевіряємо, що повідомлення є масивом
                const messages = Array.isArray(result.messages) ? result.messages : [];
                this.renderMessages(messages);
                
                // Показуємо інтерфейс чату
                document.getElementById('chatHeader').style.display = 'flex';
                document.getElementById('messageInputContainer').style.display = 'flex';
                
                // Приєднуємося до кімнати чату
                this.socket.emit('join_chat', chatId);
                
                // Позначаємо повідомлення як прочитані
                this.markAsRead(chatId);
                
                // Clear notifications for this chat
                if (window.messageNotifications) {
                    window.messageNotifications.removeNotificationsForChat(chatId);
                }
                
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('? Failed to select chat:', error);
            this.showError('Failed to load conversation');
        }
    }renderChatHeader() {
        if (!this.currentChat) return;
        
        const otherParticipant = this.currentChat.participants.find(p => p.userId !== this.currentUser.id);
        const chatTitle = document.getElementById('chatTitle');
        const chatStatus = document.getElementById('chatStatus');
        const chatActions = document.getElementById('chatActions') || this.createChatActionsContainer();
        
        if (this.currentChat.type === 'private' && otherParticipant) {
            // Приватний чат
            chatTitle.innerHTML = `
                <div class="chat-participant">
                    <div class="participant-avatar">${otherParticipant.username.charAt(0).toUpperCase()}</div>
                    <div class="participant-name">${otherParticipant.username}</div>
                </div>
            `;
              // Показуємо статус користувача
            const isOnline = this.users.get(otherParticipant.userId)?.status === 'online';            chatStatus.innerHTML = `
                <span class="status-indicator ${isOnline ? 'online' : 'offline'}"></span>
                <span class="status-text">${isOnline ? 'Online' : 'Offline'}</span>
            `;
              // Порожній контейнер для дій з чатом
            chatActions.innerHTML = ``;
        } else {
            // Груповий чат
            chatTitle.innerHTML = `
                <div class="group-chat-header">
                    <div class="group-avatar">
                        <span class="material-icons">group</span>
                    </div>
                    <div class="group-info">
                        <div class="group-name">${this.currentChat.name || 'Group Chat'}</div>
                        <div class="group-members">${this.currentChat.participants.length} members</div>
                    </div>
                </div>
            `;
              // Показуємо кількість онлайн учасників
            const onlineCount = this.currentChat.participants.filter(p => 
                this.users.get(p.userId)?.status === 'online'
            ).length;
              chatStatus.innerHTML = `
                <span class="status-indicator group"></span>
                <span class="status-text">${onlineCount} online</span>
            `;
              // Додаємо кнопку для додавання учасників
            chatActions.innerHTML = `
                <button class="add-participants-btn" id="addParticipantsBtn" title="Add participants">
                    <span class="material-icons">person_add</span>
                </button>
            `;
            
            // Додаємо обробник події для кнопки
            const addParticipantsBtn = document.getElementById('addParticipantsBtn');
            if (addParticipantsBtn) {
                addParticipantsBtn.addEventListener('click', () => {
                    this.showAddParticipantsModal();
                });
            }
        }
    }    renderMessages(messages) {
        const container = document.getElementById('messagesContainer');
        
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            container.innerHTML = `
                <div class="empty-chat">
                    <span class="material-icons">chat_bubble_outline</span>
                    <div class="empty-title">No messages yet</div>
                    <div class="empty-subtitle">Start the conversation!</div>
                </div>
            `;
            return;
        }        container.innerHTML = messages.map((message, index) => {
            // Перевіряємо, чи є повідомлення валідним
            if (!message || typeof message !== 'object') {
                console.warn('Invalid message object:', message);
                return '';
            }
            
            const isOwn = message.senderId === this.currentUser.id || (message.sender && message.sender._id === this.currentUser.id);
            const senderName = message.senderName || message.sender?.username || 'Unknown';
            const senderInitials = senderName.charAt(0).toUpperCase();
            
            // Перевіряємо чи це перше повідомлення від цього користувача або час між повідомленнями більше 5 хвилин
            const prevMessage = messages[index - 1];            const showSenderInfo = !prevMessage || 
                                 prevMessage.senderId !== message.senderId ||
                                 (message.createdAt && prevMessage.createdAt && 
                                  (new Date(message.createdAt) - new Date(prevMessage.createdAt)) > 5 * 60 * 1000);
            
            return `
                <div class="message ${isOwn ? 'own' : 'other'} ${showSenderInfo ? 'first-in-group' : ''}">
                    ${showSenderInfo && !isOwn ? `
                        <div class="message-avatar ${isOwn ? 'current-user' : ''}">
                            ${senderInitials}
                        </div>
                    ` : `
                        <div class="message-avatar-spacer"></div>
                    `}
                    <div class="message-content">
                        ${showSenderInfo && !isOwn ? `
                            <div class="message-sender">${senderName}</div>
                        ` : ''}
                        <div class="message-bubble ${isOwn ? 'own-bubble' : 'other-bubble'}">
                            <div class="message-text">${this.escapeHtml(message.content || '')}</div>
                        </div>
                        <div class="message-time ${isOwn ? 'own-time' : 'other-time'}">
                            ${this.formatTime(message.createdAt || new Date())}
                            ${isOwn ? this.getMessageStatus(message) : ''}
                        </div>                    </div>
                </div>
            `;
        }).filter(Boolean).join(''); // Фільтруємо порожні рядки

        // Прокручуємо до низу
        container.scrollTop = container.scrollHeight;
    }    getMessageStatus(message) {
        // Показуємо статус повідомлення для власних повідомлень
        if (!message) return '';
        
        if (message.readBy && Array.isArray(message.readBy) && message.readBy.length > 1) {
            return '<span class="message-status read">??</span>';
        } else if (message.delivered) {
            return '<span class="message-status delivered">?</span>';
        } else {
            return '<span class="message-status sending">?</span>';
        }
    }    createChatActionsContainer() {
        // Створюємо порожній контейнер для дій з чатом
        let chatActions = document.getElementById('chatActions');
        
        if (!chatActions) {
            chatActions = document.createElement('div');
            chatActions.id = 'chatActions';
            chatActions.className = 'chat-actions';
            
            const chatHeader = document.getElementById('chatHeader');
            chatHeader.appendChild(chatActions);
        }
        
        return chatActions;
    }
    
    setupEventListeners() {
        // Форма відправки повідомлення
        document.getElementById('messageForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Автоматичне розширення textarea
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
            
            // Індикатор набору
            this.handleTyping();
        });

        // Enter для відправки (Shift+Enter для нового рядка)
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Пошук чатів
        document.getElementById('chatSearch').addEventListener('input', (e) => {
            this.searchChats(e.target.value);
        });

        // Нова розмова
        document.getElementById('newChatBtn').addEventListener('click', () => {
            this.showNewChatDialog();
        });
    }    async sendMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        
        if (!content || !this.currentChat) return;

        try {
            // Створюємо тимчасове ID для повідомлення
            const tempId = 'temp_' + Date.now();
            
            // Відправляємо через Socket.IO для real-time
            this.socket.emit('send_message', {
                chatId: this.currentChat._id,
                senderId: this.currentUser.id,
                senderName: this.currentUser.username,
                content: content,
                messageType: 'text',
                tempId: tempId
            });

            // Очищуємо поле вводу
            input.value = '';
            input.style.height = 'auto';
            
            // Повідомлення буде додано через Socket.IO event 'new_message'
            
        } catch (error) {
            console.error('? Failed to send message:', error);
            this.showError('Failed to send message');
        }
    }    handleNewMessage(message) {
        console.log('?? New message received:', message);
        
        // Якщо повідомлення для поточного чату
        if (this.currentChat && message.chatId === this.currentChat._id) {
            this.addMessageToUI(message);
            
            // Автоматично позначаємо як прочитане якщо чат активний
            if (message.senderId !== this.currentUser.id) {
                this.markAsRead(this.currentChat._id);
            }
        } else {
            // If we're not in the chat where the message was received
            // Update the notification system if it exists
            if (window.messageNotifications && message.senderId !== this.currentUser.id) {
                window.messageNotifications.addNotification(message);
            }
        }
        
        // Оновлюємо список чатів
        this.updateChatInList(message);
        
        // Показуємо нотифікацію якщо повідомлення не від поточного користувача
        if (message.senderId !== this.currentUser.id) {
            this.showNotification(message);
        }
    }addMessageToUI(message) {
        const container = document.getElementById('messagesContainer');
        const isOwn = message.senderId === this.currentUser.id;
        const senderName = message.senderName || this.currentUser.username;
        const senderInitials = senderName.charAt(0).toUpperCase();
        
        // Видаляємо empty state якщо є
        const emptyChat = container.querySelector('.empty-chat');
        if (emptyChat) emptyChat.remove();
        
        // Перевіряємо чи потрібно показувати інформацію про відправника
        const lastMessage = container.querySelector('.message:last-child');
        const showSenderInfo = !lastMessage || 
                              !lastMessage.classList.contains(isOwn ? 'own' : 'other') ||
                              lastMessage.classList.contains('first-in-group');
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isOwn ? 'own' : 'other'} ${showSenderInfo ? 'first-in-group' : ''}`;
        messageElement.innerHTML = `
            ${showSenderInfo && !isOwn ? `
                <div class="message-avatar ${isOwn ? 'current-user' : ''}">
                    ${senderInitials}
                </div>
            ` : `
                <div class="message-avatar-spacer"></div>
            `}
            <div class="message-content">
                ${showSenderInfo && !isOwn ? `
                    <div class="message-sender">${senderName}</div>
                ` : ''}
                <div class="message-bubble ${isOwn ? 'own-bubble' : 'other-bubble'}">
                    <div class="message-text">${this.escapeHtml(message.content)}</div>
                </div>
                <div class="message-time ${isOwn ? 'own-time' : 'other-time'}">
                    ${this.formatTime(message.createdAt || new Date())}
                    ${isOwn ? '<span class="message-status sending">?</span>' : ''}
                </div>
            </div>
        `;
        
        container.appendChild(messageElement);
        container.scrollTop = container.scrollHeight;
        
        // Оновлюємо класи для попереднього повідомлення
        if (lastMessage && !showSenderInfo) {
            lastMessage.classList.remove('first-in-group');
        }
    }    updateChatInList(message) {
        // Знаходимо чат в списку і оновлюємо його
        const chatIndex = this.chats.findIndex(c => c._id === message.chatId);
        if (chatIndex !== -1) {
            this.chats[chatIndex].lastMessage = message;
            this.chats[chatIndex].lastActivity = message.timestamp || message.createdAt;
            
            // Переміщуємо чат на верх списку
            const chat = this.chats.splice(chatIndex, 1)[0];
            this.chats.unshift(chat);
            this.renderChatList();
        }
    }

    async markAsRead(chatId) {
        try {
            // Відправляємо через Socket.IO
            this.socket.emit('mark_messages_read', {
                chatId: chatId,
                userId: this.currentUser.id
            });
            
            // Також відправляємо через REST API як backup
            await fetch(`http://localhost:3001/api/messages/chat/${chatId}/read-all`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    userId: this.currentUser.id
                })
            });
        } catch (error) {
            console.error('? Failed to mark messages as read:', error);
        }
    }

    showNotification(message) {
        // Перевіряємо дозволи на нотифікації
        if (Notification.permission === 'granted') {
            const notification = new Notification(`New message from ${message.senderName}`, {
                body: message.content,
                icon: '/studentApp/public/source/icon-man192.png',
                tag: message.chatId // Групуємо нотифікації по чату
            });
            
            notification.onclick = () => {
                window.focus();
                this.selectChat(message.chatId);
                notification.close();
            };
            
            // Автоматично закриваємо через 5 секунд
            setTimeout(() => notification.close(), 5000);
        } else if (Notification.permission !== 'denied') {
            // Запитуємо дозвіл
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.showNotification(message);
                }
            });
        }
    }

    updateMessageReadStatus(data) {
        // Оновлюємо статус прочитання повідомлень в UI
        if (this.currentChat && data.chatId === this.currentChat._id) {
            const messages = document.querySelectorAll('.message.own .message-status');
            messages.forEach(status => {
                if (status.classList.contains('sending')) {
                    status.classList.remove('sending');
                    status.classList.add('read');
                    status.textContent = '??';
                }
            });
        }
    }    handleTyping() {
        if (!this.currentChat) return;
        
        this.socket.emit('typing_start', {
            chatId: this.currentChat._id,
            userId: this.currentUser.id,
            username: this.currentUser.username
        });
        
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.socket.emit('typing_stop', {
                chatId: this.currentChat._id,
                userId: this.currentUser.id,
                username: this.currentUser.username
            });
        }, 1000);
    }

    handleUserStatusChange(data) {
        this.users.set(data.userId, { status: data.status });
        if (this.currentChat) {
            this.renderChatHeader();
        }
    }

    handleUserTyping(data) {
        if (this.currentChat && data.chatId === this.currentChat._id && data.userId !== this.currentUser.id) {
            const indicator = document.getElementById('typingIndicator');
            indicator.textContent = `${data.username} is typing...`;
            indicator.style.display = 'block';
        }
    }    handleUserStopTyping(data) {
        if (this.currentChat && data.chatId === this.currentChat._id) {
            document.getElementById('typingIndicator').style.display = 'none';
        }
    }

    searchChats(query) {
        const items = document.querySelectorAll('.chat-item');
        items.forEach(item => {
            const name = item.querySelector('.chat-name').textContent.toLowerCase();
            const preview = item.querySelector('.chat-preview').textContent.toLowerCase();
            const matches = name.includes(query.toLowerCase()) || preview.includes(query.toLowerCase());
            item.style.display = matches ? 'flex' : 'none';
        });
    }    formatTime(timestamp) {
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

    truncateMessage(text, maxLength = 50) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        // Створюємо toast нотифікацію
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.innerHTML = `
            <span class="material-icons">error</span>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Анімація появи
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Видалення через 5 секунд
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }    async showNewChatDialog() {
        try {
            // Завантажуємо список студентів
            const response = await fetch('/studentApp/api/get_students_for_chat.php');
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to load students');
            }
            
            const students = result.data.filter(student => student.username !== this.currentUser.username);
            
            // Створюємо модальне вікно з вибором студентів з унікальними ID
            const modal = document.createElement('div');
            modal.className = 'modal-overlay chat-modal';
            modal.innerHTML = `
                <div class="modal-content chat-selection-modal">                <div class="modal-header">
                        <h3>Start New Conversation</h3>
                        <button class="modal-close" id="chatModalClose">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="chat-type-selector">
                            <p>Select multiple students to create a group chat!</p>
                        </div>
                        <div class="student-search">
                            <input type="text" id="chatStudentSearchInput" placeholder="Search students..." class="search-input">
                        </div>
                        <div class="student-list" id="chatStudentList">
                            ${students.map(student => `
                                <div class="student-item" data-student-id="${student.id}" data-username="${student.username}">
                                    <div class="student-avatar">${student.initials}</div>
                                    <div class="student-info">
                                        <div class="student-name">${student.username}</div>
                                        <div class="student-group">Group: ${student.group}</div>
                                    </div>
                                    <div class="student-status ${student.status}">
                                        <span class="status-indicator"></span>
                                        ${student.status}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="selected-students" id="chatSelectedStudents" style="display: none;">
                            <h4>Selected students:</h4>
                            <div class="selected-list" id="chatSelectedList"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="chatCancelNewChat">Cancel</button>
                        <button class="btn-primary" id="chatStartChatBtn" disabled>Start Chat</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Show the modal with animation
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
            
            // Обробники подій
            this.setupStudentSelectionHandlers(modal, students);
            
        } catch (error) {
            console.error('? Failed to show new chat dialog:', error);
            this.showError('Failed to load student list');
        }
    }    setupStudentSelectionHandlers(modal, students) {
        const searchInput = modal.querySelector('#chatStudentSearchInput');
        const studentList = modal.querySelector('#chatStudentList');
        const selectedStudents = modal.querySelector('#chatSelectedStudents');
        const selectedList = modal.querySelector('#chatSelectedList');
        const startChatBtn = modal.querySelector('#chatStartChatBtn');
        const cancelBtn = modal.querySelector('#chatCancelNewChat');
        const closeBtn = modal.querySelector('#chatModalClose');
        
        let selectedStudentIds = [];
        
        // Пошук студентів
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const studentItems = studentList.querySelectorAll('.student-item');
            
            studentItems.forEach(item => {
                const name = item.querySelector('.student-name').textContent.toLowerCase();
                const group = item.querySelector('.student-group').textContent.toLowerCase();
                const matches = name.includes(query) || group.includes(query);
                item.style.display = matches ? 'flex' : 'none';
            });
        });        // Вибір студентів
        studentList.addEventListener('click', (e) => {
            const studentItem = e.target.closest('.student-item');
            if (!studentItem) return;
            
            const studentId = studentItem.dataset.studentId;
            const username = studentItem.dataset.username;
            
            console.log('Student clicked:', {studentId, username}); // Debug log
            
            if (selectedStudentIds.includes(studentId)) {
                // Видаляємо з вибраних
                selectedStudentIds = selectedStudentIds.filter(id => id !== studentId);
                studentItem.classList.remove('selected');
            } else {                // Перевіряємо, чи існує студент з таким ID
                const studentExists = students.some(s => s.id.toString() === studentId.toString());
                if (studentExists) {
                    selectedStudentIds.push(studentId);
                    studentItem.classList.add('selected');
                } else {
                    console.error('? Invalid student ID:', studentId);
                }
            }
            
            this.updateSelectedStudentsList(selectedStudentIds, students, selectedStudents, selectedList);
            startChatBtn.disabled = selectedStudentIds.length === 0;
        });          // Початок чату
        startChatBtn.addEventListener('click', async () => {
            if (selectedStudentIds.length > 0) {
                console.log('Starting chat with student IDs:', selectedStudentIds); // Debug log
                console.log('Available students:', students); // Debug log
                
                // Знаходимо всіх вибраних студентів
                const selectedStudents = selectedStudentIds.map(id => 
                    students.find(s => s.id.toString() === id.toString())
                ).filter(Boolean);
                
                if (selectedStudents.length === 0) {
                    console.error('? No valid students found with selected IDs');
                    this.showError('Selected students not found');
                    return;
                }
                
                console.log('Found students:', selectedStudents); // Debug log
                
                // Якщо вибрано одного студента, створюємо приватний чат
                if (selectedStudents.length === 1) {
                    await this.createNewChatWithStudent(selectedStudents[0]);
                } else {
                    // Якщо вибрано кількох студентів, створюємо груповий чат
                    await this.createNewGroupChat(selectedStudents);
                }
                modal.remove();
            }
        });
        
        // Закриття модального вікна
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        };
        cancelBtn.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
      updateSelectedStudentsList(selectedIds, allStudents, container, list) {
        if (selectedIds.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        const selectedStudents = selectedIds.map(id => 
            allStudents.find(s => s.id.toString() === id.toString())
        ).filter(Boolean);
        
        list.innerHTML = selectedStudents.map(student => `
            <div class="selected-student">
                <span class="selected-avatar">${student.initials}</span>
                <span class="selected-name">${student.username}</span>
                <span class="selected-group">(${student.group})</span>
            </div>
        `).join('');
    }    async createNewChatWithStudent(student) {
        try {
            console.log('Creating chat with student object:', student); // Debug log
            
            if (!student) {
                this.showError('Student object is undefined');
                throw new Error('Student object is undefined');
            }
            
            if (typeof student !== 'object') {
                this.showError('Invalid student data');
                throw new Error('Student is not a valid object');
            }
            
            if (!student.username) {
                this.showError('Student username is missing');
                throw new Error('Student username is missing');
            }
            
            console.log('Creating chat with validated student:', student); // Debug log
              // Підготовка параметрів у форматі, що очікує API
            const user1Id = this.currentUser.id;
            const user1Name = this.currentUser.username;
            const user2Id = `php_${student.username}`;
            const user2Name = student.username;
            
            console.log('Creating private chat with params:', { user1Id, user1Name, user2Id, user2Name });
            
            const response = await fetch('http://localhost:3001/api/chats/private', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    user1Id,
                    user1Name,
                    user2Id,
                    user2Name
                })
            });

            const result = await response.json();
            
            if (result.success) {
                await this.loadChats();
                if (result.chat && result.chat._id) {
                    this.selectChat(result.chat._id);
                }
            } else {
                throw new Error(result.message || 'Failed to create chat');
            }
        } catch (error) {
            console.error('? Failed to create chat with student:', error);
            this.showError('Failed to create conversation: ' + error.message);
        }
    }

    createNewChatFromModal() {
        // Метод залишається для зворотної сумісності, але не використовується
        const input = document.getElementById('usernameInput');
        if (input) {
            const username = input.value.trim();
            
            if (username) {
                this.createNewChat(username);
                input.closest('.modal-overlay').remove();
            }
        }
    }    async createNewChat(username) {
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
            console.error('? Failed to create chat:', error);
            this.showError('Failed to create conversation');
        }
    }    async createNewGroupChat(students) {
        try {
            if (!students || !Array.isArray(students) || students.length < 2) {
                throw new Error('Need at least 2 students for a group chat');
            }
            
            // Генеруємо назву групового чата на основі імен учасників
            const groupName = students.length <= 3 
                ? students.map(s => s.username).join(', ') 
                : `${students[0].username}, ${students[1].username} and ${students.length - 2} others`;
            
            console.log('Creating group chat with name:', groupName); // Debug log
            
            // Підготовка учасників для API у форматі, який очікує сервер
            const participantIds = students.map(student => `php_${student.username}`);
            const participantNames = students.map(student => student.username);
            
            console.log('Group chat participantIds:', participantIds); // Debug log
            console.log('Group chat participantNames:', participantNames); // Debug log
            
            const response = await fetch('http://localhost:3001/api/chats/group', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    name: groupName,
                    creatorId: this.currentUser.id,
                    creatorName: this.currentUser.username,
                    participantIds: participantIds,
                    participantNames: participantNames,
                    description: `Group chat created by ${this.currentUser.username}`
                })
            });

            const result = await response.json();
            
            if (result.success) {
                await this.loadChats();
                if (result.chat && result.chat._id) {
                    this.selectChat(result.chat._id);
                }
            } else {
                throw new Error(result.message || 'Failed to create group chat');
            }
        } catch (error) {
            console.error('? Failed to create group chat with students:', error);
            this.showError('Failed to create group conversation: ' + error.message);
        }
    }
    
    async showAddParticipantsModal() {
        try {
            // Завантажуємо список студентів
            const response = await fetch('http://localhost:3001/api/students-for-chat', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to load students');
            }
            
            const students = result.data;
            
            // Фільтруємо студентів, які вже є учасниками чату
            const currentParticipantIds = this.currentChat.participants.map(p => parseInt(p.userId));
            const availableStudents = students.filter(student => 
                !currentParticipantIds.includes(parseInt(student.id))
            );
            
            if (availableStudents.length === 0) {
                this.showError('All students are already participants in this chat');
                return;
            }
            
            this.renderAddParticipantsModal(availableStudents);
            
        } catch (error) {
            console.error('? Failed to load students:', error);
            this.showError('Failed to load students list');
        }
    }
    
    renderAddParticipantsModal(students) {
        // Створюємо модальне вікно
        const modalHtml = `
            <div class="chat-modal" id="addParticipantsModal">
                <div class="chat-selection-modal">
                    <div class="modal-header">
                        <h3>Add Participants</h3>
                        <button class="modal-close" id="closeAddParticipantsModal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="students-search">
                            <input type="text" class="search-input" placeholder="Search students..." id="studentsSearch">
                        </div>
                        <div class="students-list" id="studentsList">
                            ${students.map(student => `
                                <div class="student-item" data-student-id="${student.id}">
                                    <div class="student-checkbox">
                                        <input type="checkbox" id="student-${student.id}" value="${student.id}">
                                    </div>
                                    <div class="student-avatar">${student.initials}</div>
                                    <div class="student-info">
                                        <div class="student-name">${student.username}</div>
                                        <div class="student-group">${student.group}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="selected-students" id="selectedStudents" style="display: none;">
                            <h4>Selected students:</h4>
                            <div class="selected-list" id="selectedList"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="cancelAddParticipants">Cancel</button>
                        <button class="btn-primary" id="confirmAddParticipants" disabled>Add Selected</button>
                    </div>
                </div>
            </div>
        `;
        
        // Додаємо модальне вікно до DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Показуємо модальне вікно
        const modal = document.getElementById('addParticipantsModal');
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        this.setupAddParticipantsModal(students);
    }
    
    setupAddParticipantsModal(students) {
        const modal = document.getElementById('addParticipantsModal');
        const closeBtn = document.getElementById('closeAddParticipantsModal');
        const cancelBtn = document.getElementById('cancelAddParticipants');
        const confirmBtn = document.getElementById('confirmAddParticipants');
        const searchInput = document.getElementById('studentsSearch');
        const selectedStudents = document.getElementById('selectedStudents');
        const selectedList = document.getElementById('selectedList');
        
        let selectedStudentIds = new Set();
        
        // Закриття модального вікна
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        // Обробка кліку поза модальним вікном
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Пошук студентів
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const studentItems = document.querySelectorAll('.student-item');
            
            studentItems.forEach(item => {
                const studentName = item.querySelector('.student-name').textContent.toLowerCase();
                const studentGroup = item.querySelector('.student-group').textContent.toLowerCase();
                
                if (studentName.includes(searchTerm) || studentGroup.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
        
        // Обробка вибору студентів
        document.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.id.startsWith('student-')) {
                const studentId = e.target.value;
                const student = students.find(s => s.id == studentId);
                
                if (e.target.checked) {
                    selectedStudentIds.add(studentId);
                } else {
                    selectedStudentIds.delete(studentId);
                }
                
                // Оновлюємо список вибраних студентів
                this.updateSelectedStudents(selectedStudentIds, students, selectedStudents, selectedList);
                
                // Оновлюємо стан кнопки
                confirmBtn.disabled = selectedStudentIds.size === 0;
            }
        });
        
        // Підтвердження додавання
        confirmBtn.addEventListener('click', () => {
            this.addParticipantsToChat(Array.from(selectedStudentIds));
            closeModal();
        });
    }
    
    updateSelectedStudents(selectedIds, students, container, list) {
        if (selectedIds.size === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        
        const selectedStudents = Array.from(selectedIds).map(id => 
            students.find(s => s.id == id)
        ).filter(Boolean);
        
        list.innerHTML = selectedStudents.map(student => `
            <div class="selected-student">
                <div class="selected-avatar">${student.initials}</div>
                <span>${student.username}</span>
            </div>
        `).join('');
    }
    
    async addParticipantsToChat(studentIds) {
        try {
            if (!this.currentChat || studentIds.length === 0) {
                return;
            }
            
            const response = await fetch('http://localhost:3001/api/chats/add-participants', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    chatId: this.currentChat._id,
                    userIds: studentIds
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Оновлюємо поточний чат
                this.currentChat.participants = result.participants;
                
                // Оновлюємо заголовок чату
                this.renderChatHeader();
                
                // Показуємо повідомлення про успіх
                console.log(`? Successfully added ${studentIds.length} participants to chat`);
                
                // Можемо показати повідомлення в чаті
                const studentNames = result.addedParticipants?.map(p => p.username).join(', ') || 'participants';
                this.showSystemMessage(`${studentNames} joined the chat`);
                
            } else {
                throw new Error(result.message || 'Failed to add participants');
            }
            
        } catch (error) {
            console.error('? Failed to add participants:', error);
            this.showError('Failed to add participants to chat');
        }
    }
    
    showSystemMessage(message) {
        const container = document.getElementById('messagesContainer');
        
        const systemMessage = document.createElement('div');
        systemMessage.className = 'system-message';
        systemMessage.innerHTML = `
            <div class="system-message-content">
                <span class="material-icons">info</span>
                <span class="system-text">${this.escapeHtml(message)}</span>
            </div>
        `;
        
        container.appendChild(systemMessage);
        container.scrollTop = container.scrollHeight;
    }

    // ...existing code...
}

// Ініціалізуємо чат після завантаження сторінки
let chatApp;
document.addEventListener('DOMContentLoaded', () => {
    chatApp = new ChatApp();
});
