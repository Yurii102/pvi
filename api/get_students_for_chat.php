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
    // Get all students from MySQL database
    $stmt = $pdo->prepare("SELECT id, name, student_group, gender FROM students ORDER BY name ASC");
    $stmt->execute();
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format the data for chat usage
    $formattedStudents = array_map(function($student) {
        return [
            'id' => $student['id'],
            'username' => $student['name'],
            'group' => $student['student_group'],
            'gender' => $student['gender'],
            'initials' => substr($student['name'], 0, 1),
            'status' => 'offline' // Default status
        ];
    }, $students);
    
    echo json_encode([
        'success' => true,
        'data' => $formattedStudents
    ]);
    
} catch (PDOException $e) {
    error_log("Database error in get_students_for_chat: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred'
    ]);
}
?>