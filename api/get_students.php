<?php
require_once __DIR__ . '/../controllers/StudentController.php'; // Adjust path as needed

$controller = new StudentController();
$controller->listStudents();
?>
