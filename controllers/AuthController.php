<?php
require_once __DIR__ . '/../models/User.php';

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = $_POST['username'] ?? null;
    $password = $_POST['password'] ?? null;

    if ($name && $password) {
        $user = User::login($name, $password);        if ($user) {
            $_SESSION['loggedin'] = true;
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['name'];
            session_regenerate_id(true);
            header('Location: /studentApp/index.php?page=student');
            exit;
        } else {
            $_SESSION['login_error'] = 'Неправильне ім\'я користувача або пароль.';
            header('Location: /studentApp/index.php?page=student&login_error=1');
            exit;
        }
    } else {
        $_SESSION['login_error'] = 'Потрібно ввести ім\'я користувача та пароль.';
        header('Location: /studentApp/index.php?page=student&login_error=1');
        exit;
    }
} else {
    header('Location: /studentApp/index.php');
    exit;
}
?>