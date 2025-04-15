<?php
// controllers/MainController.php
require_once MODELS . 'User.php';

class MainController {
    // Головна сторінка
    public function home() {
        require_once VIEWS . 'student.php';
    }
    
    // Сторінка дашборду
    public function dashboard() {
        require_once VIEWS . 'dashboard.php';
    }
    
    // Сторінка повідомлень
    public function messages() {
        require_once VIEWS . 'messages.php';
    }
    
    // Сторінка завдань
    public function tasks() {
        require_once VIEWS . 'tasks.php';
    }
    

    public function handleLogin() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $name = $_POST['username'] ?? '';
            $dob = $_POST['password'] ?? '';
    
            $userModel = new UserModel();
            $user = $userModel->authenticate($name, $dob);
    
            if ($user) {
                $_SESSION['user'] = $user;
                header('Location: index.php?page=dashboard'); 
                exit();
            } else {
                $_SESSION['error'] = "Невірне ім’я або дата народження.";
                header('Location: index.php?page=login');
                exit();
            }
        }
    }

    public function login() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $username = $_POST['username'];
            $password = $_POST['password'];
    
            // Перевірка на масиві студентів (імітація бази)
            $students = [
                ['name' => 'Yurii Surniak', 'dob' => '23032006']
            ];
    
            foreach ($students as $student) {
                if ($student['name'] === $username && $student['dob'] === $password) {
                    $_SESSION['loggedin'] = true;
                    $_SESSION['username'] = $username;
                    header('Location: /studentApp/index.php');
                    exit;
                }
            }
    
            // Невдала спроба
            echo "<script>alert('Невірне ім’я або пароль'); window.location.href='/studentApp/index.php';</script>";
        }
    }
    
    public function logout() {
        session_unset();         // Очищає всі змінні сесії
        session_destroy();       // Знищує саму сесію
        header('Location: index.php?page=home'); // Або login/dashboard — куди зручно
        exit();
    }
}