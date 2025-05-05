<?php
// API точка для видалення студентів
require_once __DIR__ . '/../controllers/StudentController.php';

$controller = new StudentController();
$controller->deleteStudents();
?>
