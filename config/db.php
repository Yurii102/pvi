<?php
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
    
    error_log("PDO Connection Error: " . $e->getMessage());
    die("Не вдалося підключитися до бази даних. Будь ласка, спробуйте пізніше."); 
    
}
?>