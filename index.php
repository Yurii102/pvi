<?php
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

$page = $_GET['page'] ?? 'student';
$view_to_render = null;

$action = $_GET['action'] ?? null;

if ($action === 'login') {
    require_once __DIR__ . '/controllers/AuthController.php';
    exit;
} elseif ($page === 'logout') {
    require_once __DIR__ . '/controllers/LogoutController.php';
    exit;
}

require_once 'views/layouts/header.php';

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
        $view_to_render = 'views/student.php';
        break;
}

if ($view_to_render && file_exists(__DIR__ . '/' . $view_to_render)) {
    require_once __DIR__ . '/' . $view_to_render;
} else {
    echo "<p>Помилка: Сторінку не знайдено.</p>";
}
?>