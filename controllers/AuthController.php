<?php
require_once __DIR__ . '/../models/User.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = $_POST['name'];
    $password = $_POST['pasword'];

    $user = User::login($name, $password);

    if ($user) {
        $_SESSION['loggedin'] = true;
        $_SESSION['username'] = $user['name'];
        header('Location: /studentApp/index.php');
        exit;
    }else{
        $_SESSION['error'] = 'Invalid login';
        header('Location: /studentApp/index.php');
        exit;
    }
}