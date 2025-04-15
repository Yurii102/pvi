<?php
// index.php в корені проекту (точка входу)
session_start();

// Шляхи до основних директорій
define('ROOT', dirname(__FILE__));
define('CONTROLLERS', ROOT . '/controllers/');
define('MODELS', ROOT . '/models/');
define('VIEWS', ROOT . '/views/');

// Підключення контролерів
require_once CONTROLLERS . 'mainController.php';

// Простий маршрутизатор
$page = isset($_GET['page']) ? $_GET['page'] : 'home';

// Створюємо контролер
$controller = new MainController();

// Вибираємо метод в залежності від запитаної сторінки
switch ($page) {
    case 'home':
        $controller->home();
        break;
    case 'dashboard':
        $controller->dashboard();
        break;
    case 'messages':
        $controller->messages();
        break;
    case 'tasks':
        $controller->tasks();
        break;
    case 'login':
        $controller->login();
        break;
    case 'logout':
        $controller->logout();
        break;
    default:
        $controller->home();
}