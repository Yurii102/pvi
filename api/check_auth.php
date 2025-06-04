<?php
// API endpoint для перевірки статусу автентифікації PHP сесії
require_once '../config/db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:3001');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Перевірка автентифікації
$isLoggedIn = isset($_SESSION['loggedin']) && $_SESSION['loggedin'];
$username = $_SESSION['username'] ?? null;
$userId = $_SESSION['user_id'] ?? null;

// Якщо user_id відсутній, спробуємо його отримати з бази даних за username
if ($isLoggedIn && !$userId && $username) {
    try {
        $stmt = $pdo->prepare('SELECT id FROM students WHERE name = ?');
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user) {
            $userId = $user['id'];
            $_SESSION['user_id'] = $userId; // Зберігаємо для майбутніх запитів
        }
    } catch (Exception $e) {
        error_log("Error getting user ID: " . $e->getMessage());
    }
}

if ($isLoggedIn && $username) {
    echo json_encode([
        'success' => true,
        'loggedIn' => true,
        'authenticated' => true,
        'user' => [
            'id' => $userId,
            'username' => $username,
            'sessionId' => session_id()
        ]
    ]);
} else {
    echo json_encode([
        'success' => true,
        'loggedIn' => false,
        'authenticated' => false,
        'message' => 'User not authenticated'
    ]);
}
?>
