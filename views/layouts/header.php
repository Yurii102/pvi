<?php
$loggedIn = isset($_SESSION['loggedin']) && $_SESSION['loggedin'] === true;
?>

<header id="header">
        <div class="headerBack">
            <a href="/studentApp/index.php" ><h1 class="logo">CMS</h1></a>
            
            <div class="user-info">
                <div class="bell" id="bell"  data-loggedin="<?= isset($_SESSION['loggedin']) && $_SESSION['loggedin'] ? 'true' : 'false' ?>">
                    <div>
                        <img src="public/source/bell.png" alt="Повідомлення" class="icon-bell" id="bellIcon">
                        <span class="notification-dot" id="notificationDot"></span>
                    </div>

                    <div class="notification-popup" id="notificationPopup">
                        <div class="notification-item">
                            <div class="user-info-notification">
                                <img src="public/source/user.png" alt="Avatar">
                                <strong>Студент 1</strong>
                            </div>
                            
                            <div class="rectangle">
                                <p class="text-content">Ваше повідомлення тут.</p>
                            </div>
                        </div>
                        <div class="notification-item">
                            <div class="user-info-notification">
                                <img src="public/source/user.png" alt="Avatar">
                                <strong>Студент 2</strong>
                            </div>

                            <div class="rectangle">
                                <p class="text-content">Інше повідомлення тут.</p>
                            </div>
                        </div>
                        <div class="notification-item">
                            <div class="user-info-notification">
                                <img src="public/source/user.png" alt="Avatar">
                                <strong>Студент 3</strong>
                            </div>

                            <div class="rectangle">
                                <p class="text-content">Ще одне повідомлення тут.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <?php if ($loggedIn): ?>
                <div class="user" id="user">
                    <img src="public/source/user.png" alt="Ім'я користувача" class="icon">
                    <span class="user-name">Yurii Surniak</span>

                    <div class="profile-popup" id="profilePopup">
                        <ul class="popup-menu">
                            <li><a href="#">Profile</a></li>
                            <?php if (isset($_SESSION['loggedin']) && $_SESSION['loggedin']): ?>
                            <li><a href="index.php?page=logout">Log Out</a></li>
                            <?php endif; ?>
                        </ul> 
                    </div>
                </div>
                <?php else: ?>
                <!-- Кнопка Log In -->
                <button class="LogIn" id="loginButton">Log In</button>
            <?php endif; ?>
            </div>
        </div>
    </header>