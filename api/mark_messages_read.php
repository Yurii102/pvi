<?php
require_once '../config/db.php';

session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

$userId = $_SESSION['user_id'] ?? null;
$username = $_SESSION['username'] ?? null;

// Якщо user_id відсутній, спробуємо його отримати з бази даних за username
if (!$userId && $username) {
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

if (!$userId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'User ID not found']);
    exit;
}
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['chatId'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Chat ID is required']);
    exit;
}

$chatId = $input['chatId'];

try {
    // Використовуємо HTTP запит до Node.js сервера
    $nodeServerUrl = 'http://localhost:3001/api/messages/mark-read';
    
    $postData = json_encode([
        'chatId' => $chatId,
        'userId' => (string)$userId
    ]);
    
    // Ініціалізуємо cURL
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $nodeServerUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($postData),
        'User-Agent: StudentApp/1.0'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($curlError) {
        throw new Exception("cURL error: " . $curlError);
    }
    
    if ($httpCode !== 200) {
        throw new Exception("Node.js server returned HTTP $httpCode");
    }
    
    $result = json_decode($response, true);
    
    if (!$result) {
        throw new Exception("Invalid JSON response from Node.js server");
    }
    
    if (!$result['success']) {
        throw new Exception($result['message'] ?? 'Unknown error from Node.js server');
    }
    
    // Повертаємо результат
    echo json_encode([
        'success' => true,
        'message' => $result['message'] ?? 'Messages marked as read',
        'markedCount' => $result['markedCount'] ?? 0,
        'chatId' => $chatId,
        'userId' => $userId
    ]);
    
} catch (Exception $e) {
    error_log("Error marking messages as read: " . $e->getMessage());
    
    // Повертаємо помилку, але не критичну
    echo json_encode([
        'success' => false, 
        'message' => 'Failed to mark messages as read: ' . $e->getMessage(),
        'chatId' => $chatId,
        'userId' => $userId,
        'error' => $e->getMessage()
    ]);
}
?>
