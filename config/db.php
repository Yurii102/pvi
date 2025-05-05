<?php
// Файл конфігурації для підключення до бази даних
$host = 'localhost';
$db   = 'student_app';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";

try {
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
} catch (\PDOException $e) {
    // У реальному застосунку тут краще логувати помилку, а не викидати її назовні
    error_log("PDO Connection Error: " . $e->getMessage());
    die("Не вдалося підключитися до бази даних. Будь ласка, спробуйте пізніше."); // Повідомлення для користувача
    // throw new \PDOException($e->getMessage(), (int)$e->getCode()); // Можна залишити для режиму розробки
}
?>