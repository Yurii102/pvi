<?php
// API endpoint для генерації JWT токенів на основі PHP сесій
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:3001');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../models/User.php';

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

function generateJWT($userId, $username, $email, $role = 'student') {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode([
        'userId' => $userId,
        'username' => $username,
        'email' => $email,
        'role' => $role,
        'iat' => time(),
        'exp' => time() + (7 * 24 * 60 * 60) // 7 днів
    ]);
    
    $headerEncoded = base64url_encode($header);
    $payloadEncoded = base64url_encode($payload);
    
    $signature = hash_hmac('sha256', $headerEncoded . "." . $payloadEncoded, 'your_jwt_secret_key_here_change_in_production', true);
    $signatureEncoded = base64url_encode($signature);
    
    return $headerEncoded . "." . $payloadEncoded . "." . $signatureEncoded;
}

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

// Перевірка автентифікації
if (!isset($_SESSION['loggedin']) || !$_SESSION['loggedin']) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'User not authenticated'
    ]);
    exit();
}

// Отримання інформації про користувача з бази даних
$username = $_SESSION['username'] ?? null;

if (!$username) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Session invalid'
    ]);
    exit();
}

// Отримуємо повну інформацію про користувача з бази даних
require_once __DIR__ . '/../config/db.php';

try {
    $stmt = $pdo->prepare('SELECT * FROM students WHERE name = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'User not found in database'
        ]);
        exit();
    }
      // Генерація JWT токену з реальними даними користувача
    // Знаходимо відповідного користувача в MongoDB за username
    $userId = 'user_' . $user['id']; // Використовуємо MySQL ID як базу
    $email = $user['email'] ?? $username . '@student.local';
    $role = ($user['student_group'] === 'TEACHER') ? 'teacher' : 'student';
    
    $token = generateJWT($userId, $username, $email, $role);
    
    echo json_encode([
        'success' => true,
        'token' => $token,
        'user' => [
            'id' => $userId,
            'username' => $username,
            'email' => $email,
            'role' => $role,
            'group' => $user['student_group'],
            'fullName' => $username // можна додати surname, якщо потрібно
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error generating token',
        'error' => $e->getMessage()
    ]);
}
?>
