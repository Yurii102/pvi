<!DOCTYPE html>
<html lang="uk">
  
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
    <title>Dashboard</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
    <link rel="stylesheet" href="./styles/header.css">
    <link rel="stylesheet" href="./styles/navigation.css">
    <link rel="stylesheet" href="./styles/table.css">
    <link rel="stylesheet" href="./styles/studentsMain.css">
    <link rel="stylesheet" href="./styles/modal.css">

    <link rel="manifest" href="/manifest.json">

    <script>
        if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                    navigator.serviceWorker.register('service-worker.js')
                        .then((registration) => {
                            console.log('Service Worker зареєстровано:', registration);
                        })
                        .catch((error) => {
                            console.log('Помилка реєстрації Service Worker:', error);
                        });
                });
            }
    </script>
</head>
  
<body>
    <a class="skipmain" href="#header" target="_self"><h1>Student Managment</h1></a>
    
    <header id="header">
        <div class="headerBack">
            <a href="./index.html" ><h1 class="logo">CMS</h1></a>
            
            <div class="user-info">
                <div class="bell" id="bell">
                    <div>
                        <img src="./source/bell.png" alt="Повідомлення" class="icon-bell" id="bellIcon">
                        <span class="notification-dot" id="notificationDot"></span>
                    </div>

                    <div class="notification-popup" id="notificationPopup">
                        <div class="notification-item">
                            <div class="user-info-notification">
                                <img src="./source/user.png" alt="Avatar">
                                <strong>Студент 1</strong>
                            </div>
                            
                            <div class="rectangle">
                                <p class="text-content">Ваше повідомлення тут.</p>
                            </div>
                        </div>
                        <div class="notification-item">
                            <div class="user-info-notification">
                                <img src="./source/user.png" alt="Avatar">
                                <strong>Студент 2</strong>
                            </div>

                            <div class="rectangle">
                                <p class="text-content">Інше повідомлення тут.</p>
                            </div>
                        </div>
                        <div class="notification-item">
                            <div class="user-info-notification">
                                <img src="./source/user.png" alt="Avatar">
                                <strong>Студент 3</strong>
                            </div>

                            <div class="rectangle">
                                <p class="text-content">Ще одне повідомлення тут.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="user" id="user">
                    <img src="./source/user.png" alt="Ім'я користувача" class="icon">
                    <span class="user-name">Yurii Surniak</span>

                    <div class="profile-popup" id="profilePopup">
                        <ul class="popup-menu">
                            <li><a href="#">Profile</a></li>
                            <li><a href="#">Log Out</a></li>
                        </ul> 
                    </div>
                </div>
            </div>
        </div>
    </header>

    <main>

        <button class="burger-menu" id="burger-menu">
            <span class="material-icons">menu</span>
        </button>
        <aside>
            <nav class="sidebar">
                <a href="./dashboard.html" id="dashboard-link">Dashboard</a>
                <a href="./index.html" id="students-link">Students</a>
                <a href="./tasks.html" id="tasks-link">Tasks</a>
            </nav>
        </aside>
    </main>
    <script src="./scripts/header.js"></script>
    <script src="./scripts/navigation.js"></script>
</body>
</html>