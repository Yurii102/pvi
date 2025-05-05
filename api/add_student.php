<?php
// API точка для додавання нового студента
require_once __DIR__ . '/../controllers/StudentController.php';

$controller = new StudentController();
$controller->addStudent();
?>
