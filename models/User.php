<?php
require_once __DIR__ . '/../config/db.php';

class User {
    static public function login($name, $password) {
        global $pdo;
        // Check if $pdo is available
        if (!$pdo) {
            error_log("PDO connection not available in User::login");
            return false; // Indicate failure
        }
        try {
            // Prepare and execute the query
            $stmt = $pdo->prepare('SELECT * FROM students WHERE name = ? AND password = ?');
            $stmt->execute([$name, $password]);
            // Fetch the user
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (\PDOException $e) {
            // Log database errors
            error_log("Database error in User::login: " . $e->getMessage());
            return false; // Indicate failure
        }
    }
}