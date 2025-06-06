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

// ���� user_id ��������, �������� ���� �������� � ���� ����� �� username
if (!$userId && $username) {
    try {
        $stmt = $pdo->prepare('SELECT id FROM students WHERE name = ?');
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user) {
            $userId = $user['id'];
            $_SESSION['user_id'] = $userId; // �������� ��� ��������� ������
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

try {
    // ������������� HTTP ����� �� Node.js ������� ������ ������� ���������� �� MongoDB
    // �������� � userId � username ��� ������� ������
    $nodeServerUrl = 'http://localhost:3001/api/messages/unread/' . urlencode($userId) . '?username=' . urlencode($username);
    
    // ����������� cURL
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $nodeServerUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
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
    
    // ��������� ��������� � ���������� �����������
    echo json_encode([
        'success' => true,
        'notifications' => $result['notifications'] ?? [],
        'count' => $result['count'] ?? 0,
        'userId' => $userId,
        'username' => $username,
        'source' => 'nodejs-api'
    ]);
    
} catch (Exception $e) {
    error_log("Error getting unread messages: " . $e->getMessage());
    
    // ��������� �������� ��������� ������ �������, ��� �� ������ UI
    echo json_encode([
        'success' => true, // ������������ true, ��� �� ���������� ������� �����������
        'notifications' => [],
        'count' => 0,
        'userId' => $userId,
        'username' => $username,
        'error' => $e->getMessage(),
        'fallback' => true
    ]);
}
?>
