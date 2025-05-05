<?php
// API точка для оновлення даних студента
require_once __DIR__ . '/../controllers/StudentController.php';

$controller = new StudentController();
$controller->updateStudent();
?>