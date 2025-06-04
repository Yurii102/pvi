<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:3001');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/db.php';

try {
    // Отримуємо JWT токен з заголовків
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
        throw new Exception('Missing or invalid authorization token');
    }
    
    $token = substr($authHeader, 7);
    
    // Тут можна додати перевірку JWT токену якщо потрібно
    // Для простоти пропускаємо детальну перевірку
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method');
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['chatId']) || !isset($input['userIds'])) {
        throw new Exception('Missing required parameters: chatId, userIds');
    }
    
    $chatId = $input['chatId'];
    $userIds = $input['userIds'];
    
    if (!is_array($userIds) || empty($userIds)) {
        throw new Exception('userIds must be a non-empty array');
    }
    
    // Перевіряємо чи існує чат
    $stmt = $pdo->prepare("SELECT id, name, type FROM chats WHERE id = ?");
    $stmt->execute([$chatId]);
    $chat = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$chat) {
        throw new Exception('Chat not found');
    }
    
    // Початок транзакції
    $pdo->beginTransaction();
    
    $addedParticipants = [];
    
    foreach ($userIds as $userId) {
        // Перевіряємо чи користувач існує в таблиці students
        $stmt = $pdo->prepare("SELECT id, name FROM students WHERE id = ?");
        $stmt->execute([$userId]);
        $student = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$student) {
            continue; // Пропускаємо неіснуючих користувачів
        }
        
        // Перевіряємо чи користувач вже є учасником чату
        $stmt = $pdo->prepare("SELECT id FROM chat_participants WHERE chat_id = ? AND user_id = ?");
        $stmt->execute([$chatId, $userId]);
        
        if ($stmt->fetch()) {
            continue; // Користувач вже є учасником
        }
        
        // Додаємо користувача як учасника чату
        $stmt = $pdo->prepare("INSERT INTO chat_participants (chat_id, user_id, joined_at) VALUES (?, ?, NOW())");
        $stmt->execute([$chatId, $userId]);
        
        $addedParticipants[] = [
            'userId' => $userId,
            'username' => $student['name']
        ];
    }
    
    if (empty($addedParticipants)) {
        $pdo->rollBack();
        throw new Exception('No new participants were added (they might already be members)');
    }
    
    // Отримуємо оновлений список учасників
    $stmt = $pdo->prepare("
        SELECT cp.user_id as userId, s.name as username, cp.joined_at as joinedAt
        FROM chat_participants cp
        JOIN students s ON cp.user_id = s.id
        WHERE cp.chat_id = ?
        ORDER BY cp.joined_at ASC
    ");
    $stmt->execute([$chatId]);
    $participants = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Підтверджуємо транзакцію
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Participants added successfully',
        'addedParticipants' => $addedParticipants,
        'participants' => $participants,
        'chatId' => $chatId
    ]);
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    error_log("Error in add_participant.php: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>