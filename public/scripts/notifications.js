// Notification management system for chat messages
class MessageNotifications {
    constructor() {
        // DOM elements
        this.bellIcon = document.getElementById('bellIcon');
        this.notificationDot = document.getElementById('notificationDot');
        this.notificationPopup = document.getElementById('notificationPopup');
        this.isLoggedIn = document.getElementById('bell')?.dataset.loggedin === "true";
        
        // State variables
        this.notifications = [];
        this.currentChatId = null;
        this.currentPage = window.location.pathname;
        
        // Initialize
        this.init();
    }    init() {
        // Check if user is logged in
        if (!this.isLoggedIn) {
            console.log("?? User not logged in, notification system disabled");
            return;
        }
        
        console.log("?? Initializing notification system...");
        
        // Load any stored notifications from sessionStorage
        this.loadStoredNotifications();
        
        // Load unread messages from server (with delay to ensure session is ready)
        setTimeout(() => {
            this.loadUnreadMessages();
        }, 1000);
        
        // If we're on the messages page, extract current chat ID from URL
        if (this.currentPage.includes('page=messages')) {
            const urlParams = new URLSearchParams(window.location.search);
            this.currentChatId = urlParams.get('chat');
            
            // If we have a chat ID in URL, remove notifications for this chat
            if (this.currentChatId) {
                console.log("?? User is in chat:", this.currentChatId);
                this.removeNotificationsForChat(this.currentChatId);
            }
            
            // Setup updates if chat changes through navigation
            this.setupChatChangeListener();
        }
        
        // Setup click handlers for notifications
        this.setupEventListeners();
        
        // Setup socket listeners if we're on any page
        this.setupSocketListeners();
        
        console.log("?? Notification system initialized");
    }async loadUnreadMessages() {
        try {
            console.log("?? Loading unread messages...");
            const response = await fetch('/studentApp/api/get_unread_messages.php', {
                method: 'GET',
                credentials: 'include', // Включаємо cookies для сесії
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            // Перевіряємо чи отримали HTML замість JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn("?? API returned non-JSON response, content type:", contentType);
                return;
            }
            
            const text = await response.text();
            console.log("?? Raw response:", text.substring(0, 200));
            
            let result;
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                console.error("?? Failed to parse JSON response:", parseError);
                console.log("?? Response text:", text);
                return;
            }
            
            if (!response.ok) {
                console.warn(`?? API returned ${response.status}:`, result.message);
                return;
            }
            
            if (result.success && result.notifications && result.notifications.length > 0) {
                console.log(`?? Loaded ${result.notifications.length} unread messages`);
                
                // Merge with existing notifications, avoiding duplicates
                const existingIds = new Set(this.notifications.map(n => n.id || n._id));
                const newNotifications = result.notifications.filter(n => !existingIds.has(n.id || n._id));
                
                this.notifications = [...this.notifications, ...newNotifications];
                this.saveNotifications();
                this.updateUI();
            } else if (result.success) {
                console.log("?? No unread messages found");
            } else {
                console.warn("?? API returned error:", result.message);
            }
        } catch (error) {
            console.error("?? Failed to load unread messages:", error);
        }
    }
    
    setupChatChangeListener() {
        // Monitor URL changes to detect chat navigation
        const originalPushState = window.history.pushState;
        const originalReplaceState = window.history.replaceState;
        const self = this;
        
        window.history.pushState = function() {
            originalPushState.apply(this, arguments);
            self.updateChatIdFromUrl();
        };
        
        window.history.replaceState = function() {
            originalReplaceState.apply(this, arguments);
            self.updateChatIdFromUrl();
        };
        
        // Also update on popstate
        window.addEventListener('popstate', () => {
            this.updateChatIdFromUrl();
        });
    }
    
    updateChatIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const newChatId = urlParams.get('chat');
        
        if (newChatId && newChatId !== this.currentChatId) {
            this.currentChatId = newChatId;
            this.removeNotificationsForChat(this.currentChatId);
        }
    }
    
    loadStoredNotifications() {
        try {
            const stored = sessionStorage.getItem('chatNotifications');
            if (stored) {
                this.notifications = JSON.parse(stored);
                // Filter out old notifications (older than 1 day)
                const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
                this.notifications = this.notifications.filter(n => n.timestamp > oneDayAgo);
            }
        } catch (e) {
            console.error('Failed to load stored notifications:', e);
            this.notifications = [];
        }
    }
    
    saveNotifications() {
        try {
            sessionStorage.setItem('chatNotifications', JSON.stringify(this.notifications));
        } catch (e) {
            console.error('Failed to save notifications:', e);
        }
    }
      updateUI() {
        // Update notification dot
        if (this.notifications.length > 0) {
            if (this.notificationDot) {
                this.notificationDot.style.display = 'block';
            }
            // Start bell animation if there are notifications
            if (this.bellIcon && !this.bellIcon.classList.contains('bell-animation')) {
                this.animateBellIcon();
            }
            this.renderNotificationPopup();
        } else {
            if (this.notificationDot) {
                this.notificationDot.style.display = 'none';
            }
            // Stop bell animation if there are no notifications
            if (this.bellIcon) {
                this.bellIcon.classList.remove('bell-animation');
            }
            this.renderEmptyNotification();
        }
    }
      renderNotificationPopup() {
        if (!this.notificationPopup) return;
        
        const notificationHTML = this.notifications.map(notification => {
            const timeAgo = this.formatTimeAgo(notification.timestamp);
            const unreadBadge = notification.unreadCount > 1 ? 
                `<span class="unread-badge">${notification.unreadCount}</span>` : '';
            
            return `
                <div class="notification-item" data-chat-id="${notification.chatId}">
                    <div class="notification-header">
                        <div class="user-info-notification">
                            <div class="user-avatar">
                                ${(notification.senderName || notification.sender)?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div class="notification-details">
                                <div class="chat-name">${this.escapeHtml(notification.chatName || notification.sender || 'Unknown Chat')}</div>
                                <div class="sender-name">${this.escapeHtml(notification.senderName || notification.sender || 'Unknown')}</div>
                            </div>
                        </div>
                        <div class="notification-meta">
                            <span class="notification-time">${timeAgo}</span>
                            ${unreadBadge}
                        </div>
                    </div>
                    <div class="notification-content">
                        <div class="text-content">${this.escapeHtml(notification.content || notification.message || '')}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        this.notificationPopup.innerHTML = notificationHTML;
        
        // Add click event listeners to each notification item
        this.setupNotificationClickHandlers();
    }
    
    setupNotificationClickHandlers() {
        const items = this.notificationPopup.querySelectorAll('.notification-item');
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                const chatId = item.getAttribute('data-chat-id');
                if (chatId) {
                    this.navigateToChat(chatId);
                    e.stopPropagation(); // Prevent the bell click handler from triggering
                }
            });
        });
    }
    
    renderEmptyNotification() {
        if (!this.notificationPopup) return;
        
        this.notificationPopup.innerHTML = `
            <div class="notification-item">
                <p>No new notifications.</p>
            </div>
        `;
    }
      escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatTimeAgo(timestamp) {
        const now = new Date();
        const messageTime = new Date(timestamp);
        const diffMs = now - messageTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return messageTime.toLocaleDateString();
    }
      isInSameChat(chatId) {
        // Check if user is already in the messages page and in the specified chat
        if (this.currentPage.includes('page=messages')) {
            // Get current chat from URL or from chat.js if available
            if (this.currentChatId === chatId) {
                return true;
            }
            
            // Try to get from window.chatApp if available
            if (window.chatApp && 
                window.chatApp.currentChat && 
                window.chatApp.currentChat._id === chatId) {
                return true;
            }
        }
        return false;
    }    addNotification(message) {
        // If we're already in this chat, don't show notification
        if (this.isInSameChat(message.chatId)) {
            return;
        }
        
        // Check if notification already exists
        const exists = this.notifications.some(n => 
            n.chatId === message.chatId && 
            (n.content === message.content || n.message === message.content) &&
            (n.senderName === message.senderName || n.sender === message.senderName) &&
            Math.abs(new Date(n.timestamp) - Date.now()) < 5000 // Within 5 seconds
        );
        
        if (exists) {
            console.log("?? Notification already exists, skipping");
            return;
        }
        
        // Determine chat name for display
        let chatName = message.chatName || message.sender || message.senderName || 'Unknown Chat';
        
        // Add to notifications array with new structure
        this.notifications.unshift({
            id: message.id || message._id || Date.now().toString(),
            chatId: message.chatId,
            chatName: chatName,
            senderName: message.senderName || message.sender,
            content: message.content || message.message,
            timestamp: message.timestamp || new Date().toISOString(),
            unreadCount: message.unreadCount || 1,
            messageId: message.messageId || message._id
        });
        
        // Keep only last 20 notifications
        if (this.notifications.length > 20) {
            this.notifications = this.notifications.slice(0, 20);
        }
        
        // Save to storage
        this.saveNotifications();
        
        // Update UI
        this.updateUI();
        
        console.log(`?? Added notification from ${message.senderName}: ${message.content}`);
    }
      animateBellIcon() {
        if (this.bellIcon && this.notifications.length > 0) {
            this.bellIcon.classList.add('bell-animation');
            
            // Set up repeating animation while there are notifications
            this.bellIcon.addEventListener('animationend', () => {
                if (this.notifications.length > 0) {
                    // Continue animation if there are still notifications
                    setTimeout(() => {
                        if (this.notifications.length > 0) {
                            this.bellIcon.classList.remove('bell-animation');
                            setTimeout(() => {
                                if (this.notifications.length > 0) {
                                    this.bellIcon.classList.add('bell-animation');
                                }
                            }, 100);
                        }
                    }, 2000); // Wait 2 seconds before next animation
                } else {
                    this.bellIcon.classList.remove('bell-animation');
                }
            }, { once: true });
        }
    }
      removeNotificationsForChat(chatId) {
        const initialCount = this.notifications.length;
        this.notifications = this.notifications.filter(n => n.chatId !== chatId);
        
        if (initialCount !== this.notifications.length) {
            // Save to storage
            this.saveNotifications();
            
            // Update UI
            this.updateUI();
            
            // Also mark messages as read on the server
            this.markMessagesAsRead(chatId);
        }
    }
    
    async markMessagesAsRead(chatId) {
        try {
            const response = await fetch('/studentApp/api/mark_messages_read.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ chatId })
            });
            
            const result = await response.json();
            if (result.success) {
                console.log(`? Marked ${result.markedCount} messages as read for chat ${chatId}`);
            } else {
                console.error('Failed to mark messages as read:', result.message);
            }
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }
      navigateToChat(chatId) {
        // Remove notifications for this chat
        this.removeNotificationsForChat(chatId);
        
        // Navigate to messages page with this chat open
        window.location.href = `/studentApp/index.php?page=messages&chat=${chatId}`;
    }
    
    clearAllNotifications() {
        this.notifications = [];
        this.saveNotifications();
        this.updateUI();
    }
      setupEventListeners() {
        // Make sure notification is updated when bell is clicked
        const bell = document.getElementById('bell');
        if (bell) {
            bell.addEventListener('click', () => {
                // Clear the notification dot when bell is clicked
                if (this.notificationDot) {
                    this.notificationDot.style.display = 'none';
                }
                
                // Save the change to storage
                this.clearAllNotifications();
            });
        }
    }
      setupSocketListeners() {
        // Wait for chatApp to be initialized if we're on messages page
        if (this.currentPage.includes('page=messages')) {
            this.waitForChatApp();
        } else {
            // For other pages, check if socket.io is available and connect directly
            if (window.io) {
                this.connectToSocketServer();
            } else {
                // Load socket.io dynamically if not already loaded
                this.loadSocketIO();
            }
        }
    }

    waitForChatApp() {
        const checkChatApp = () => {
            if (window.chatApp && window.chatApp.socket && window.chatApp.currentUser) {
                console.log("?? Using existing chatApp socket for notifications");
                this.attachToExistingSocket();
            } else {
                // Keep checking until chatApp is ready
                setTimeout(checkChatApp, 500);
            }
        };
        checkChatApp();
    }    attachToExistingSocket() {
        if (!window.chatApp || !window.chatApp.socket) return;
        
        const self = this;
        
        // Listen for new messages
        window.chatApp.socket.on('new_message', function(message) {
            console.log("?? Notification system received new message:", message);
            
            // Only show notification if message is not from current user
            if (message.senderId !== window.chatApp.currentUser?.id) {
                // Check if user is currently in this chat
                const isInThisChat = window.chatApp.currentChat && 
                                   window.chatApp.currentChat._id === message.chatId;
                
                if (!isInThisChat) {
                    console.log("?? Adding notification for message from", message.senderName);
                    self.addNotification(message);
                } else {
                    console.log("?? User is in this chat, not showing notification");
                }
            }
        });        // Also listen for global messages (for users on other pages)
        window.chatApp.socket.on('global_new_message', function(message) {
            console.log("?? Notification system received global message:", message);
            console.log("?? Message is for recipient:", message.recipientId, message.recipientName);
            
            // Since server now sends messages only to recipients, we don't need to check senderId
            // But let's add a safety check just in case
            if (message.senderId !== window.chatApp.currentUser?.id) {
                console.log("?? Adding global notification for message from", message.senderName);
                self.addNotification(message);
            } else {
                console.log("?? Ignoring message from self (safety check)");
            }
        });
        
        console.log("?? Notification system attached to chatApp socket");
    }

    loadSocketIO() {
        const script = document.createElement('script');
        script.src = 'http://localhost:3001/socket.io/socket.io.js';
        script.onload = () => {
            this.connectToSocketServer();
        };
        script.onerror = () => {
            console.error("Failed to load socket.io script");
        };
        document.head.appendChild(script);
    }    connectToSocketServer() {
        try {
            console.log("?? Creating direct socket connection for notifications");
            const socket = window.io('http://localhost:3001');
            
            socket.on('connect', () => {
                console.log("?? Notification socket connected");
                
                // Try to get current user from any available source
                this.getCurrentUserInfo((userInfo) => {
                    if (userInfo) {
                        socket.emit('user_join', userInfo);
                    }
                });
            });
            
            socket.on('new_message', (message) => {
                console.log("?? Direct socket received new message:", message);
                this.addNotification(message);
            });

            socket.on('global_new_message', (message) => {
                console.log("?? Direct socket received global message:", message);
                this.addNotification(message);
            });
            
            this.socket = socket;
        } catch (error) {
            console.error("Failed to connect to socket server:", error);
        }
    }

    getCurrentUserInfo(callback) {
        // Try to get user info from various sources
        if (window.chatApp && window.chatApp.currentUser) {
            callback({
                userId: window.chatApp.currentUser.id,
                username: window.chatApp.currentUser.username
            });
            return;
        }

        // Try to get from session/API
        fetch('/studentApp/api/check_auth.php')
            .then(response => response.json())
            .then(data => {
                if (data.loggedIn) {
                    callback({
                        userId: data.user.id,
                        username: data.user.username
                    });
                } else {
                    callback(null);
                }
            })
            .catch(() => callback(null));
    }
}

// Initialize the notification system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.messageNotifications = new MessageNotifications();
});
