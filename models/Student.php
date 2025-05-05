<?php

require_once __DIR__ . '/../config/db.php';

// Клас для роботи з даними студентів у базі даних
class Student
{
    private $pdo;

    public function __construct()
    {
        global $pdo;
        $this->pdo = $pdo;
    }

    /**
     * Отримати список студентів з пагінацією.
     * @param int $limit Кількість студентів на сторінці.
     * @param int $offset Зміщення для пагінації.
     * @return array Список студентів.
     * @throws PDOException У разі помилки бази даних.
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
     * Підрахувати загальну кількість студентів.
     * @return int Загальна кількість студентів.
     * @throws PDOException У разі помилки бази даних.
     */
    public function countAll(): int
    {
        $countStmt = $this->pdo->query('SELECT COUNT(*) FROM students');
        return (int)$countStmt->fetchColumn();
    }

    /**
     * Перевірити, чи існує студент з таким іменем (опціонально виключаючи певний ID).
     * @param string $name Ім'я для перевірки.
     * @param int|null $excludeId ID, який потрібно виключити з перевірки (для оновлень).
     * @return bool True, якщо ім'я існує, false в іншому випадку.
     * @throws PDOException У разі помилки бази даних.
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
     * Додати нового студента до бази даних.
     * @param array $data Дані студента (student_group, name, gender, birthday).
     * @return int ID новоствореного студента.
     * @throws PDOException У разі помилки бази даних.
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
     * Оновити існуючого студента.
     * @param int $id ID студента для оновлення.
     * @param array $data Дані студента (student_group, name, gender, birthday).
     * @return int Кількість змінених рядків.
     * @throws PDOException У разі помилки бази даних.
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
     * Видалити одного або кількох студентів за їх ID.
     * @param array $ids Масив ID студентів для видалення.
     * @return int Кількість змінених рядків.
     * @throws PDOException У разі помилки бази даних.
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
     * Валідація даних студента (бізнес-правила, наприклад, вік).
     * @param array $data Дані для валідації.
     * @return array Масив помилок, порожній якщо дані валідні.
     */
    public static function validateBusinessRules(array $data): array
    {
        $errors = [];
        // Приклад валідації віку
        if (!empty($data['birthday'])) {
            try {
                $birthDate = new DateTime($data['birthday']);
                $today = new DateTime();
                $age = $today->diff($birthDate)->y;
                if ($age < 15 || $age > 80) {
                    $errors['birthday'] = 'Вік має бути між 15 та 80 роками.';
                }
            } catch (Exception $e) {
                 $errors['birthday'] = 'Некоректна дата для розрахунку віку.';
            }
        }
        return $errors;
    }
}
?>
