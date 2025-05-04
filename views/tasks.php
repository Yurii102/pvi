<!DOCTYPE html>
<html lang="uk">
  
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
    <title>Tasks</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
    <link rel="stylesheet" href="/studentApp/public/styles/header.css">
    <link rel="stylesheet" href="/studentApp/public/styles/navigation.css">
    <link rel="stylesheet" href="/studentApp/public/styles/table.css">
    <link rel="stylesheet" href="/studentApp/public/styles/studentsMain.css">
    <link rel="stylesheet" href="/studentApp/public/styles/modal.css">

    <link rel="manifest" href="/studentApp/public/manifest.json">

    <!-- <script>
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
    </script> -->
</head>
  
<body>
    <a class="skipmain" href="#header" target="_self"><h1>Student Managment</h1></a>
    
    <main>

        <button class="burger-menu" id="burger-menu">
            <span class="material-icons">menu</span>
        </button>
        <aside>
            <nav class="sidebar">
                <a href="/studentApp/index.php?page=dashboard" id="dashboard-link">Dashboard</a>
                <a href="/studentApp/index.php?page=student" id="students-link">Students</a>
                <a href="/studentApp/index.php?page=tasks" id="tasks-link">Tasks</a>
            </nav>
        </aside>
    </main>
    <script src="/studentApp/public/scripts/header.js"></script>
    <script src="/studentApp/public/scripts/navigation.js"></script>
</body>
</html>