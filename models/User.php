<?php
require_once __DIR__ . '/../config/db.php';

// Клас для роботи з користувачами (студентами)
class User {
    // Метод для автентифікації користувача за іменем та паролем (датою народження)
    static public function login($name, $password) {
        global $pdo;
        if (!$pdo) {
            error_log("PDO connection not available in User::login");
            return false;
        }
        try {
            $stmt = $pdo->prepare('SELECT * FROM students WHERE name = ?');
            $stmt->execute([$name]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && isset($user['birthday'])) {
                $birthDate = new DateTime($user['birthday']);
                $expectedPassword = $birthDate->format('dmY');

                if ($password === $expectedPassword) {
                    return $user;
                }
            }

            return false;
        } catch (\PDOException $e) {
            error_log("Database error in User::login: " . $e->getMessage());
            return false;
        } catch (\Exception $e) {
            error_log("Date formatting error in User::login: " . $e->getMessage());
            return false;
        }
    }
}