<?php
// Головний вхідний файл (маршрутизатор)
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

$page = $_GET['page'] ?? 'student';
$view_to_render = null;

$action = $_GET['action'] ?? null;

// Обробка дій (логін, вихід) перед виведенням HTML
if ($action === 'login') {
    require_once __DIR__ . '/controllers/AuthController.php';
    exit;
} elseif ($page === 'logout') {
    require_once __DIR__ . '/controllers/LogoutController.php';
    exit;
}

// Підключення шапки сайту
require_once 'views/layouts/header.php';

// Визначення файлу представлення для відображення
switch ($page) {
    case 'dashboard':
        $view_to_render = 'views/dashboard.php';
        break;
    case 'student':
        $view_to_render = 'views/student.php';
        break;
    case 'tasks':
        $view_to_render = 'views/tasks.php';
        break;
    case 'messages':
        $view_to_render = 'views/messages.php';
        break;
    default:
        $view_to_render = 'views/student.php'; // Сторінка за замовчуванням
        break;
}

// Підключення файлу представлення
if ($view_to_render && file_exists(__DIR__ . '/' . $view_to_render)) {
    require_once __DIR__ . '/' . $view_to_render;
} else {
    echo "<p>Помилка: Сторінку не знайдено.</p>";
}

// Можливе підключення підвалу сайту
// require_once 'views/layouts/footer.php';

?>