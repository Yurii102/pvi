<?php

require_once __DIR__ . '/../config/db.php'; // Adjust path as needed

class Student
{
    private $pdo;

    public function __construct()
    {
        global $pdo; // Use the global PDO connection
        $this->pdo = $pdo;
    }

    /**
     * Get a paginated list of students.
     * @param int $limit Number of students per page.
     * @param int $offset Offset for pagination.
     * @return array List of students.
     * @throws PDOException On database error.
     */
    public function getAll(int $limit, int $offset): array
    {
        $stmt = $this->pdo->prepare('SELECT id, student_group, name, gender, birthday, status FROM students ORDER BY id LIMIT :limit OFFSET :offset');
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Count all students.
     * @return int Total number of students.
     * @throws PDOException On database error.
     */
    public function countAll(): int
    {
        $countStmt = $this->pdo->query('SELECT COUNT(*) FROM students');
        return (int)$countStmt->fetchColumn();
    }

    /**
     * Check if a student name already exists (optionally excluding a specific ID).
     * @param string $name The name to check.
     * @param int|null $excludeId The ID to exclude from the check (for updates).
     * @return bool True if the name exists, false otherwise.
     * @throws PDOException On database error.
     */
    public function checkDuplicateName(string $name, ?int $excludeId = null): bool
    {
        if ($excludeId) {
            $stmtCheck = $this->pdo->prepare('SELECT id FROM students WHERE name = ? AND id != ?');
            $stmtCheck->execute([$name, $excludeId]);
        } else {
            $stmtCheck = $this->pdo->prepare('SELECT id FROM students WHERE name = ?');
            $stmtCheck->execute([$name]);
        }
        return $stmtCheck->fetch() !== false;
    }

    /**
     * Add a new student to the database.
     * @param array $data Student data (student_group, name, gender, birthday).
     * @return int The ID of the newly inserted student.
     * @throws PDOException On database error.
     */
    public function add(array $data): int
    {
        $sql = "INSERT INTO students (student_group, name, gender, birthday, status) VALUES (?, ?, ?, ?, 1)"; // Default status to 1 (online)
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $data['student_group'],
            $data['name'],
            $data['gender'],
            $data['birthday']
        ]);
        return (int)$this->pdo->lastInsertId();
    }

    /**
     * Update an existing student.
     * @param int $id The ID of the student to update.
     * @param array $data Student data (student_group, name, gender, birthday).
     * @return int Number of affected rows.
     * @throws PDOException On database error.
     */
    public function update(int $id, array $data): int
    {
        $sql = "UPDATE students SET student_group = ?, name = ?, gender = ?, birthday = ? WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $data['student_group'],
            $data['name'],
            $data['gender'],
            $data['birthday'],
            $id
        ]);
        return $stmt->rowCount();
    }

    /**
     * Delete one or more students by their IDs.
     * @param array $ids An array of student IDs to delete.
     * @return int Number of affected rows.
     * @throws PDOException On database error.
     */
    public function delete(array $ids): int
    {
        if (empty($ids)) {
            return 0;
        }
        // Ensure all IDs are integers
        $ids = array_map('intval', $ids);
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $sql = "DELETE FROM students WHERE id IN ($placeholders)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($ids);
        return $stmt->rowCount();
    }

    /**
     * Validate student data (business rules like age).
     * Can be expanded or moved to a dedicated validator class.
     * @param array $data
     * @return array Array of errors, empty if valid.
     */
    public static function validateBusinessRules(array $data): array
    {
        $errors = [];
        // Age validation (example)
        if (!empty($data['birthday'])) {
            try {
                $birthDate = new DateTime($data['birthday']);
                $today = new DateTime();
                $age = $today->diff($birthDate)->y;
                if ($age < 15 || $age > 80) {
                    $errors['birthday'] = 'Age must be between 15 and 80 years.';
                }
            } catch (Exception $e) {
                // This case should ideally be caught by format validation earlier
                 $errors['birthday'] = 'Invalid date provided for age calculation.';
            }
        }
        return $errors;
    }
}
?>
