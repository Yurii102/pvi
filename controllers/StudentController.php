<?php

require_once __DIR__ . '/../models/Student.php';

class StudentController
{
    private $studentModel;

    public function __construct()
    {
        $this->studentModel = new Student();
    }

    public function listStudents(): void
    {
        header('Content-Type: application/json');
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 5;

        if ($page < 1) $page = 1;
        if ($limit < 1) $limit = 5;
        $offset = ($page - 1) * $limit;

        try {
            $students = $this->studentModel->getAll($limit, $offset);
            $totalCount = $this->studentModel->countAll();
            $totalPages = ceil($totalCount / $limit);

            echo json_encode([
                'success' => true,
                'students' => $students,
                'pagination' => [
                    'currentPage' => $page,
                    'totalPages' => $totalPages,
                    'totalCount' => $totalCount,
                    'limit' => $limit
                ]
            ]);
        } catch (\PDOException $e) {
            error_log("Database error fetching students: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to retrieve students due to a database error.']);
        }
    }

    public function addStudent(): void
    {
        header('Content-Type: application/json');
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
            return;
        }

        $rawData = file_get_contents('php://input');
        $data = json_decode($rawData, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid JSON data received.']);
            return;
        }

        $errors = $this->validateStudentData($data);

        $businessErrors = Student::validateBusinessRules($data);
        $errors = array_merge($errors, $businessErrors);


        if (empty($errors['name']) && empty($errors['birthday']) && isset($data['name']) && isset($data['birthday'])) {
            try {
                if ($this->studentModel->checkDuplicateNameAndBirthday($data['name'], $data['birthday'])) {
                    $errors['duplicate_entry'] = 'Студент з таким іменем та датою народження вже існує.';
                }
            } catch (\PDOException $e) {
                error_log("Database error during duplicate name/birthday check: " . $e->getMessage());
                $errors['database'] = (isset($errors['database']) ? $errors['database'] . ' ' : '') . 'Помилка перевірки дублікату імені та дати народження.';
            }
        }

        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'errors' => $errors]);
            return;
        }

        try {
            $newStudentId = $this->studentModel->add($data);
            http_response_code(201);
            echo json_encode(['success' => true, 'message' => 'Студента успішно додано.', 'id' => $newStudentId]);
        } catch (\PDOException $e) {
            error_log("Database error adding student: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Помилка бази даних під час додавання.']);
        }
    }

    public function updateStudent(): void
    {
        header('Content-Type: application/json');
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
            return;
        }

        $rawData = file_get_contents('php://input');
        $data = json_decode($rawData, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid JSON data received.']);
            return;
        }

        $errors = $this->validateStudentData($data, true);

        $businessErrors = Student::validateBusinessRules($data);
        $errors = array_merge($errors, $businessErrors);

        if (empty($errors['name']) && !empty($data['id'])) {
            try {
                if ($this->studentModel->checkDuplicateName($data['name'], (int)$data['id'])) {
                    $errors['name_duplicate'] = 'Інший студент з таким іменем вже існує.';
                }
            } catch (\PDOException $e) {
                error_log("Database error during duplicate name check: " . $e->getMessage());
                $errors['database'] = 'Помилка перевірки дублікату імені.';
            }
        }

        if (empty($errors['name']) && empty($errors['birthday']) && !empty($data['id']) && isset($data['name']) && isset($data['birthday'])) {
            try {
                if ($this->studentModel->checkDuplicateNameAndBirthday($data['name'], $data['birthday'], (int)$data['id'])) {
                    $errors['duplicate_entry'] = 'Інший студент з таким іменем та датою народження вже існує.';
                }
            } catch (\PDOException $e) {
                error_log("Database error during duplicate name/birthday check: " . $e->getMessage());
                $errors['database'] = (isset($errors['database']) ? $errors['database'] . ' ' : '') . 'Помилка перевірки дублікату імені та дати народження.';
            }
        }

        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'errors' => $errors]);
            return;
        }

        try {
            $affectedRows = $this->studentModel->update((int)$data['id'], $data);
            if ($affectedRows > 0) {
                echo json_encode(['success' => true, 'message' => 'Студента успішно оновлено.']);
            } else {
                echo json_encode(['success' => true, 'message' => 'Змін для цього студента не виявлено.']);
            }
        } catch (\PDOException $e) {
            error_log("Database error updating student: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Помилка бази даних під час оновлення.']);
        }
    }

    public function deleteStudents(): void
    {
        header('Content-Type: application/json');
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
            return;
        }

        $rawData = file_get_contents('php://input');
        $data = json_decode($rawData, true);

        if (json_last_error() !== JSON_ERROR_NONE || !isset($data['ids']) || !is_array($data['ids'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid input. Expecting a JSON object with an array of "ids".']);
            return;
        }

        $idsToDelete = array_filter($data['ids'], 'is_numeric');

        if (empty($idsToDelete)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Не надано дійсних ID студентів для видалення.']);
            return;
        }

        try {
            $deletedCount = $this->studentModel->delete($idsToDelete);
            if ($deletedCount > 0) {
                echo json_encode(['success' => true, 'message' => "Успішно видалено {$deletedCount} студент(ів)."]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Студентів з наданими ID не знайдено або видалення не вдалося.']);
            }
        } catch (\PDOException $e) {
            error_log("Database error deleting students: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Помилка бази даних під час видалення.']);
        }
    }

    private function validateStudentData(array $data, bool $isUpdate = false): array
    {
        $errors = [];

        if ($isUpdate) {
            if (empty($data['id']) || !is_numeric($data['id'])) {
                $errors['id'] = 'Для оновлення потрібен дійсний ID студента.';
            }
        }

        if (empty($data['student_group'])) {
            $errors['group'] = 'Група є обов\'язковою.';
        } elseif (!preg_match('/^[A-Za-zА-Яа-яІіЇїЄє]{2}-\d{2}$/u', $data['student_group'])) {
            $errors['group'] = 'Група повинна бути у форматі XX-YY (наприклад, ПЗ-21).';
        }

        if (empty($data['name'])) {
            $errors['name'] = 'Ім\'я є обов\'язковим.';
        } elseif (mb_strlen($data['name']) < 2 || mb_strlen($data['name']) > 100) {
            $errors['name'] = 'Ім\'я повинно містити 2-100 символів.';
        }

        if (empty($data['gender']) || !in_array($data['gender'], ['M', 'F'])) {
            $errors['gender'] = 'Потрібно вказати стать (M/F).';
        }

        if (empty($data['birthday'])) {
            $errors['birthday'] = 'Дата народження є обов\'язковою.';
        } elseif (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['birthday'])) {
            $errors['birthday'] = 'Неправильний формат дати народження (РРРР-ММ-ДД).';
        }

        return $errors;
    }
}
?>
