<?php

require_once __DIR__ . '/../models/Student.php'; // Adjust path as needed

class StudentController
{
    private $studentModel;

    public function __construct()
    {
        $this->studentModel = new Student();
    }

    /**
     * Handle GET request for listing students with pagination.
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
     * Handle POST request for adding a new student.
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

        // Business rule validation (e.g., age)
        $businessErrors = Student::validateBusinessRules($data);
        $errors = array_merge($errors, $businessErrors);


        // Duplicate name check
        if (empty($errors['name'])) {
             try {
                if ($this->studentModel->checkDuplicateName($data['name'])) {
                    $errors['name'] = 'A student with this name already exists.';
                }
            } catch (\PDOException $e) {
                error_log("Database error during duplicate check: " . $e->getMessage());
                $errors['database'] = 'Error checking for duplicate name.';
            }
        }


        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'errors' => $errors]);
            return;
        }

        try {
            $newStudentId = $this->studentModel->add($data);
            http_response_code(201); // Created
            echo json_encode(['success' => true, 'message' => 'Student added successfully.', 'id' => $newStudentId]);
        } catch (\PDOException $e) {
            error_log("Database error adding student: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database error occurred during insertion.']);
        }
    }

     /**
     * Handle POST request for updating an existing student.
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

        $errors = $this->validateStudentData($data, true); // Pass true for update validation

        // Business rule validation (e.g., age)
        $businessErrors = Student::validateBusinessRules($data);
        $errors = array_merge($errors, $businessErrors);

        // Duplicate name check (excluding self)
        if (empty($errors['name']) && !empty($data['id'])) {
             try {
                if ($this->studentModel->checkDuplicateName($data['name'], (int)$data['id'])) {
                    $errors['name'] = 'Another student with this name already exists.';
                }
            } catch (\PDOException $e) {
                error_log("Database error during duplicate check: " . $e->getMessage());
                $errors['database'] = 'Error checking for duplicate name.';
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
                echo json_encode(['success' => true, 'message' => 'Student updated successfully.']);
            } else {
                // ID existed, but no data was actually changed, or ID didn't exist (though validation should catch missing ID)
                // Check if student exists to differentiate
                 echo json_encode(['success' => true, 'message' => 'No changes detected for this student.']);
                 // If you want to return 404 when ID doesn't exist, add a check here using a getById method in the model.
            }
        } catch (\PDOException $e) {
            error_log("Database error updating student: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database error occurred during update.']);
        }
    }

    /**
     * Handle POST request for deleting students.
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

        $idsToDelete = array_filter($data['ids'], 'is_numeric'); // Ensure IDs are numeric

        if (empty($idsToDelete)) {
             http_response_code(400);
             echo json_encode(['success' => false, 'message' => 'No valid student IDs provided for deletion.']);
             return;
        }

        try {
            $deletedCount = $this->studentModel->delete($idsToDelete);
            if ($deletedCount > 0) {
                echo json_encode(['success' => true, 'message' => "Successfully deleted {$deletedCount} student(s)."]);
            } else {
                // This could mean IDs didn't exist or deletion failed for other reasons (rare with PKs)
                 echo json_encode(['success' => false, 'message' => 'No students found with the provided IDs or deletion failed.']);
            }
        } catch (\PDOException $e) {
            error_log("Database error deleting students: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database error occurred during deletion.']);
        }
    }


    /**
     * Validate incoming student data for add/update operations.
     * @param array $data The data array from the request.
     * @param bool $isUpdate Is this an update operation (requires ID)?
     * @return array Array of validation errors.
     */
    private function validateStudentData(array $data, bool $isUpdate = false): array
    {
        $errors = [];

        if ($isUpdate) {
            if (empty($data['id']) || !is_numeric($data['id'])) {
                 $errors['id'] = 'Valid Student ID is required for update.';
            }
        }

        if (empty($data['student_group'])) {
            $errors['group'] = 'Group is required.';
        } elseif (!preg_match('/^[A-Za-z]{2}-\d{2}$/', $data['student_group'])) {
            $errors['group'] = 'Group should be in format XX-YY (e.g., PZ-21).';
        }

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
        } elseif (strlen($data['name']) < 2 || strlen($data['name']) > 100) {
            $errors['name'] = 'Name should contain 2-100 characters.';
        }

        if (empty($data['gender']) || !in_array($data['gender'], ['M', 'F'])) {
            $errors['gender'] = 'Valid gender (M/F) is required.';
        }

        if (empty($data['birthday'])) {
            $errors['birthday'] = 'Birthday is required.';
        } elseif (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['birthday'])) {
            $errors['birthday'] = 'Invalid birthday format (YYYY-MM-DD).';
        }

        return $errors;
    }
}
?>
