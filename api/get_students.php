<?php
// API точка для отримання списку студентів
require_once __DIR__ . '/../controllers/StudentController.php';

$controller = new StudentController();
$controller->listStudents();
?>
