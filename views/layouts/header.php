<?php

// Check login status
$isLoggedIn = isset($_SESSION['loggedin']) && $_SESSION['loggedin'] === true;
$username = $isLoggedIn ? $_SESSION['username'] : 'Guest'; // Get username if logged in

?>
<!DOCTYPE html>
<html lang="uk">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Зручний інтерфейс для роботи з даними.">
    <title>Student Management</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
    <!-- Adjust CSS paths if header.php is in a different directory -->
    <link rel="stylesheet" href="/studentApp/public/styles/header.css">
    <link rel="stylesheet" href="/studentApp/public/styles/navigation.css">
    <link rel="stylesheet" href="/studentApp/public/styles/modal.css">
    <link rel="manifest" href="/studentApp/public/manifest.json">
    <!-- Add other common head elements -->
</head>

<body>
    <header id="header">
        <div class="headerBack">
            <a href="/studentApp/index.php">
                <h1 class="logo">CMS</h1>
            </a>

            <div class="user-info">
                <?php if ($isLoggedIn): ?>
                    <!-- Bell icon and notifications - Display only when logged in -->
                    <div class="bell" id="bell" data-loggedin="true">
                        <div>
                            <img src="/studentApp/public/source/bell.png" alt="Повідомлення" class="icon-bell" id="bellIcon">
                            <span class="notification-dot" id="notificationDot" style="display: none;"></span> <!-- Initially hidden -->
                        </div>
                        <div class="notification-popup" id="notificationPopup">
                            <!-- Notification items here -->
                            <div class="notification-item">
                                <p>No new notifications.</p>
                            </div>
                        </div>
                    </div>

                    <!-- User profile section - Display only when logged in -->
                    <div class="user" id="user">
                        <img src="/studentApp/public/source/user.png" alt="User Avatar" class="icon">
                        <span class="user-name"><?php echo htmlspecialchars($username); ?></span>
                        <div class="profile-popup" id="profilePopup">
                            <ul class="popup-menu">
                                <li><a href="#">Profile</a></li>
                                <!-- Logout Link -->
                                <li><a href="/studentApp/index.php?page=logout">Log Out</a></li>
                            </ul>
                        </div>
                    </div>
                <?php else: ?>
                    <!-- Bell icon (hidden but present for JS) - Display when logged out -->
                     <div class="bell" id="bell" data-loggedin="false" style="display: none;"></div>
                    <!-- Login Button - Display only when logged out -->
                    <button class="LogIn" id="loginButton">Log in</button>
                <?php endif; ?>
            </div>
        </div>
    </header>

    <!-- Login Modal (remains the same, triggered by header.js) -->
    <div id="loginModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Login to System</h2>
                <span class="close" id="closeLoginModal">&times;</span>
            </div>
            <div class="modal-body">
                <!-- Ensure action points to the correct login handler -->
                <!-- The action should point to the controller handling the login -->
                <form id="login-form" action="/studentApp/index.php?action=login" method="post">
                    <div class="form-field">
                        <label for="username">Username:</label>
                        <input type="text" id="username" name="username" required>
                        <div class="error-message" id="username-error">Please enter your username</div>
                    </div>
                    <div class="form-field">
                        <label for="password">Password:</label>
                        <input type="password" id="password" name="password" required>
                        <div class="error-message" id="password-error">Please enter your password</div>
                    </div>
                    <!-- Form is submitted by JS, no submit button needed inside form -->
                </form>
            </div>
            <div class="modal-footer">
                <button class="cancel-btn" id="login-cancel-btn">Cancel</button>
                <!-- This button triggers the form submission via header.js -->
                <button class="create-btn" id="login-submit-btn">Login</button>
            </div>
        </div>
    </div>
    <!-- Modal Overlay -->
    <div id="modal-overlay" class="modal-overlay"></div>

    <!-- Scripts will be included in the main page files (e.g., student.php) after the body -->
</body>
</html>