<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
    <title>Messages</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
    <link rel="stylesheet" href="public/styles/header.css">
    <link rel="stylesheet" href="public/styles/navigation.css">
    <link rel="stylesheet" href="public/styles/table.css">
    <link rel="stylesheet" href="public/styles/studentsMain.css">
    <link rel="stylesheet" href="public/styles/modal.css">

</head>
<body>
    <a class="skipmain" href="#header" target="_self"><h1>Student Managment</h1></a>
    
    <?php include VIEWS . 'layouts/header.php'; ?>

    <main>

        <button class="burger-menu" id="burger-menu">
            <span class="material-icons">menu</span>
        </button>
        <aside>
            <nav class="sidebar">
                <a href="./dashboard.php" id="dashboard-link">Dashboard</a>
                <a href="./index.php" id="students-link">Students</a>
                <a href="./tasks.php" id="tasks-link">Tasks</a>
            </nav>
        </aside>
    </main>
    <script src="./scripts/header.js"></script>
    <script src="./scripts/navigation.js"></script>
</body>
</html>