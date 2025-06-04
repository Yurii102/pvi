<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">    <title>Messages - Student Chat</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
    <link rel="stylesheet" href="/studentApp/public/styles/header.css">
    <link rel="stylesheet" href="/studentApp/public/styles/navigation.css">
    <link rel="stylesheet" href="/studentApp/public/styles/table.css">
    <link rel="stylesheet" href="/studentApp/public/styles/studentsMain.css">
    <link rel="stylesheet" href="/studentApp/public/styles/modal.css">
    <link rel="stylesheet" href="/studentApp/public/styles/messages.css">
</head>
<body class="messages-page">
    <a class="skipmain" href="#header" target="_self"><h1>Student Management</h1></a>

    <main>
        <button class="burger-menu" id="burger-menu">
            <span class="material-icons">menu</span>
        </button>
        <aside>
            <nav class="sidebar">
                <a href="./index.php?page=dashboard" id="dashboard-link">Dashboard</a>
                <a href="./index.php" id="students-link">Students</a>
                <a href="./index.php?page=tasks" id="tasks-link">Tasks</a>
                <a href="./index.php?page=messages" id="messages-link" class="active">Messages</a>
            </nav>
        </aside>

        <div class="chat-container">
            <!-- Sidebar з списком чатів -->
            <div class="chat-sidebar">
                <div class="chat-header">
                    <h2>Messages</h2>
                    <button class="new-chat-btn" id="newChatBtn">
                        <span class="material-icons" style="font-size: 16px; margin-right: 5px;">add</span>
                        New Chat
                    </button>
                </div>
                
                <div class="chat-search">
                    <input type="text" class="search-input" placeholder="Search conversations..." id="chatSearch">
                </div>
                
                <div class="chat-list" id="chatList">
                    <div class="loading">Loading chats...</div>
                </div>
            </div>

            <!-- Основна частина чату -->
            <div class="chat-main">
                <div class="chat-main-header" id="chatHeader" style="display: none;">
                    <div class="chat-title" id="chatTitle">Select a chat</div>
                    <div class="chat-status" id="chatStatus"></div>
                </div>

                <div class="messages-container" id="messagesContainer">
                    <div class="empty-chat">
                        <span class="material-icons">chat_bubble_outline</span>
                        <div>Select a conversation to start messaging</div>
                    </div>
                </div>

                <div class="typing-indicator" id="typingIndicator" style="display: none;"></div>                <div class="message-input-container" id="messageInputContainer" style="display: none;">
                    <form class="message-input-form" id="messageForm">
                        <textarea class="message-input" id="messageInput" placeholder="Type a message..." rows="1"></textarea>
                        <button type="submit" class="send-message-btn" id="sendBtn">
                            <span class="material-icons">send</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </main>    <!-- Socket.IO Script -->    <script src="http://localhost:3001/socket.io/socket.io.js"></script>
    <script src="/studentApp/public/scripts/notifications.js"></script>
    <script src="/studentApp/public/scripts/header.js"></script>
    <script src="/studentApp/public/scripts/navigation.js"></script>
    <script src="/studentApp/public/scripts/chat.js"></script>
</body>
</html>