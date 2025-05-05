<?php

require_once __DIR__ . '/../models/Student.php';

// Контролер для обробки запитів, пов'язаних зі студентами (API)
class StudentController
{
    private $studentModel;

    public function __construct()
    {
        $this->studentModel = new Student();
    }

    /**
     * Обробляє GET-запит для отримання списку студентів з пагінацією.
     */
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

    /**
     * Обробляє POST-запит для додавання нового студента.
     */
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

        // Валідація бізнес-правил (наприклад, вік)
        $businessErrors = Student::validateBusinessRules($data);
        $errors = array_merge($errors, $businessErrors);

        // Перевірка на дублікат імені
        if (empty($errors['name'])) {
             try {
                if ($this->studentModel->checkDuplicateName($data['name'])) {
                    $errors['name'] = 'Студент з таким іменем вже існує.';
                }
            } catch (\PDOException $e) {
                error_log("Database error during duplicate check: " . $e->getMessage());
                $errors['database'] = 'Помилка перевірки дублікату імені.';
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

     /**
     * Обробляє POST-запит для оновлення існуючого студента.
     */
    public function updateStudent(): void
    {
        header('Content-Type: application/json');
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { // Or PUT
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

        $errors = $this->validateStudentData($data, true); // true для валідації оновлення

        // Валідація бізнес-правил
        $businessErrors = Student::validateBusinessRules($data);
        $errors = array_merge($errors, $businessErrors);

        // Перевірка на дублікат імені (виключаючи поточного студента)
        if (empty($errors['name']) && !empty($data['id'])) {
             try {
                if ($this->studentModel->checkDuplicateName($data['name'], (int)$data['id'])) {
                    $errors['name'] = 'Інший студент з таким іменем вже існує.';
                }
            } catch (\PDOException $e) {
                error_log("Database error during duplicate check: " . $e->getMessage());
                $errors['database'] = 'Помилка перевірки дублікату імені.';
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

    /**
     * Обробляє POST-запит для видалення студентів.
     */
    public function deleteStudents(): void
    {
         header('Content-Type: application/json');
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { // Using POST for simplicity, could be DELETE
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


    /**
     * Валідація вхідних даних студента для операцій додавання/оновлення.
     * @param array $data Масив даних із запиту.
     * @param bool $isUpdate Чи це операція оновлення (вимагає ID)?
     * @return array Масив помилок валідації.
     */
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
        } elseif (!preg_match('/^[A-Za-zА-Яа-яІіЇїЄє]{2}-\d{2}$/u', $data['student_group'])) { // Додано підтримку кирилиці та флаг 'u'
            $errors['group'] = 'Група повинна бути у форматі XX-YY (наприклад, ПЗ-21).';
        }


        if (empty($data['name'])) {
            $errors['name'] = 'Ім\'я є обов\'язковим.';
        } elseif (mb_strlen($data['name']) < 2 || mb_strlen($data['name']) > 100) { // Використання mb_strlen для багатобайтових символів
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
