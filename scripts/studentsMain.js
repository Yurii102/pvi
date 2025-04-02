const modal = document.getElementById("student-modal");
const overlay = document.getElementById("modal-overlay");
const addBtn = document.getElementById("add-btn"); 
const createBtn = document.getElementById("create-btn");
const closeBtn = document.getElementById("close-btn");
const cancelBtn = document.getElementById("cancel-btn");
const tableBody = document.querySelector("#students-table tbody");
const modalTitle = document.querySelector('.modal-header h2');
const submitButton = document.getElementById('create-btn');
const selectAllCheckbox = document.getElementById("select-all");

let isEditMode = false;
let editingRow = null;
let nextStudentId = 100;
let studentsData = {}; 

function generateUniqueId() {
    return nextStudentId++;
}

function initializeTableRows() {
    const rows = document.querySelectorAll("#students-table tbody tr");
    rows.forEach((row, index) => {
        
        const studentId = row.dataset.studentId || generateUniqueId();
        row.dataset.studentId = studentId;
        
       
        const group = row.cells[1].textContent.trim();
        const fullName = row.cells[2].textContent.trim();
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts[1] : '';
        const gender = row.cells[3].textContent.trim();
        const birthday = row.cells[4].textContent.trim();
        const status = row.cells[5].querySelector('.status').classList.contains('online') ? 'online' : 'offline';
        
        studentsData[studentId] = {
            id: studentId,
            group: group,
            firstName: firstName,
            lastName: lastName,
            gender: gender,
            birthday: birthday,
            status: status
        };
    });
}

function openAddModal() {
    isEditMode = false;
    editingRow = null;
    
    document.getElementById("student-group").value = "";
    document.getElementById("first-name").value = "";
    document.getElementById("last-name").value = "";
    document.getElementById("gender").value = "";
    document.getElementById("birthday").value = "";
    
    modalTitle.textContent = "Add student";
    submitButton.textContent = "Create";
    
    overlay.style.display = "block";
    modal.style.display = "block";
    
    modal.offsetWidth;
    overlay.classList.add('show');
    modal.classList.add('show');
}

function openEditModal(row) {
    isEditMode = true;
    editingRow = row;
    
    const studentId = row.dataset.studentId;
    console.log(`Редагування студента з ID: ${studentId}`);
    const studentData = studentsData[studentId];
    if (!studentData) {
        console.error(`Студента з ID ${studentId} не знайдено`);
        return;
    }
    
    document.getElementById("student-group").value = studentData.group;
    document.getElementById("first-name").value = studentData.firstName;
    document.getElementById("last-name").value = studentData.lastName;
    
    if (studentData.gender === 'M') {
        document.getElementById("gender").value = "Male";
    } else if (studentData.gender === 'F') {
        document.getElementById("gender").value = "Female";
    }
    
    if (studentData.birthday) {
        const dateParts = studentData.birthday.split('.');
        if (dateParts.length === 3) {
            const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            document.getElementById("birthday").value = formattedDate;
        }
    }
    
    modalTitle.textContent = "Edit student";
    submitButton.textContent = "Save";
    
    overlay.style.display = "block";
    modal.style.display = "block";
    
    // Trigger reflow to ensure transition works
    modal.offsetWidth;
    overlay.classList.add('show');
    modal.classList.add('show');
}

function closeModal() {
    overlay.classList.remove('show');
    modal.classList.remove('show');
    
    setTimeout(() => {
        modal.style.display = "none";
        overlay.style.display = "none";
    }, 300); // Match this timing with CSS transition duration
}

function saveStudent() {
    // Validate form before saving
    if (!validateForm()) {
        // If using HTML validation and form is invalid, trigger native browser validation
        if (document.getElementById("html-validation").checked) {
            const form = document.querySelector("#student-form");
            form.reportValidity();
        }
        return; // Don't save if validation fails
    }

    const group = document.getElementById("student-group").value;
    const firstName = document.getElementById("first-name").value;
    const lastName = document.getElementById("last-name").value;
    const gender = document.getElementById("gender").value;
    const birthday = document.getElementById("birthday").value;

    const formattedDate = formatDate(birthday);
    
    if (isEditMode && editingRow) {
        const studentId = editingRow.dataset.studentId;
        
        editingRow.cells[1].innerHTML = `<strong>${group}</strong>`;
        editingRow.cells[2].innerHTML = `<strong>${firstName} ${lastName}</strong>`;
        editingRow.cells[3].textContent = gender[0];
        editingRow.cells[4].innerHTML = `<strong>${formattedDate}</strong>`;
        
        studentsData[studentId] = {
            ...studentsData[studentId],
            group: group,
            firstName: firstName,
            lastName: lastName,
            gender: gender[0],
            birthday: formattedDate
        };
        
        console.log(`Оновлено студента з ID: ${studentId}`);
        console.log('Оновлений запис:', JSON.stringify(studentsData[studentId], null, 2));
    } else {
        const studentId = generateUniqueId();
        const row = document.createElement("tr");
        row.dataset.studentId = studentId;
        
        row.innerHTML = `
            <td><input type="checkbox" aria-label="checkbox items"></td>
            <td><strong>${group}</strong></td>
            <td><strong>${firstName} ${lastName}</strong></td>
            <td>${gender[0]}</td>
            <td><strong>${formattedDate}</strong></td>
            <td><span class="status offline"></span></td>
            <td>
                <button class="edit-btn" disabled><span class="material-icons">edit</span></button>
                <button class="delete-btn" disabled><span class="material-icons">delete</span></button>
            </td>
        `;
        
        tableBody.appendChild(row);
        
        studentsData[studentId] = {
            id: studentId,
            group: group,
            firstName: firstName,
            lastName: lastName,
            gender: gender[0],
            birthday: formattedDate,
            status: 'offline'
        };
        
        console.log(`Створено нового студента з ID: ${studentId}`);
        console.log('Новий запис:', JSON.stringify(studentsData[studentId], null, 2));
    }
    
    updateRowActions();
    closeModal();
    
    // Log complete student data as formatted JSON
    console.log('Всі дані студентів:');
    console.log(JSON.stringify(studentsData, null, 2));
}

// Допоміжна функція для форматування дати
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

document.querySelector("tbody").addEventListener("click", function (event) {
    if (event.target.closest(".edit-btn:not([disabled])")) {
        const row = event.target.closest("tr");
        openEditModal(row);
    }
});

cancelBtn.addEventListener("click", closeModal);
closeBtn.addEventListener("click", closeModal);
addBtn.addEventListener("click", openAddModal);
createBtn.addEventListener("click", saveStudent);

// ОНОВЛЕНО: ЗМІНЕНО ВИКОРИСТАННЯ КОНСТАНТИ ДЛЯ ЧЕКБОКСІВ (ТЕПЕР ВОНИ ОНОВЛЮЮТЬСЯ)
function updateRowActions() {
    const rowCheckboxes = document.querySelectorAll("tbody input[type='checkbox']");
    
    rowCheckboxes.forEach((checkbox) => {
        const row = checkbox.closest("tr");
        const editBtn = row.querySelector(".edit-btn");
        const deleteBtn = row.querySelector(".delete-btn");

        if (checkbox.checked) {
            editBtn.removeAttribute("disabled");
            deleteBtn.removeAttribute("disabled");
        } else {
            editBtn.setAttribute("disabled", "true");
            deleteBtn.setAttribute("disabled", "true");
        }
    });

    const allChecked = [...rowCheckboxes].every(checkbox => checkbox.checked);
    selectAllCheckbox.checked = allChecked;
}

document.querySelector("tbody").addEventListener("change", function (event) {
    if (event.target.type === "checkbox") {
        updateRowActions();
    }
});

selectAllCheckbox.addEventListener("change", function () {
    const checkboxes = document.querySelectorAll("tbody input[type='checkbox']");
    checkboxes.forEach(checkbox => checkbox.checked = selectAllCheckbox.checked);
    updateRowActions(); 
});

document.querySelector("tbody").addEventListener("click", function (event) {
    if (event.target.closest(".delete-btn")) {
        const row = event.target.closest("tr");
        const studentName = row.cells[2].textContent; 
        openDeleteModal(row, studentName);
    }
});

const deleteModal = document.getElementById("delete-modal");
const deleteOverlay = document.getElementById("modal-overlay");
const confirmDeleteBtn = document.getElementById("delete-confirm-btn");
const cancelDeleteBtn = document.getElementById("delete-cancel-btn");
const deleteCloseBtn = document.getElementById("delete-close-btn");
const deleteMessage = document.getElementById("delete-message");

let studentRowToDelete = null; 

function openDeleteModal(row, studentName) {
    studentRowToDelete = row;
    
    const selectedRows = document.querySelectorAll("tbody input[type='checkbox']:checked");
    const selectedCount = selectedRows.length;
    
    if (selectedCount === 1) {
        const selectedRow = selectedRows[0].closest("tr");
        const studentId = selectedRow.dataset.studentId;
        
        // Отримуємо дані студента за його ID
        const studentData = studentsData[studentId];
        if (studentData) {
            const fullName = `${studentData.firstName} ${studentData.lastName}`;
            deleteMessage.textContent = `Are you sure you want to delete student ${fullName} (ID: ${studentId})?`;
        } else {
            deleteMessage.textContent = `Are you sure you want to delete this student?`;
        }
    } else if (selectedCount > 1) {
        deleteMessage.textContent = `Are you sure you want to delete ${selectedCount} students?`;
    }
    
    deleteOverlay.style.display = "block";
    deleteModal.style.display = "block";
    
    deleteModal.offsetWidth;
    deleteOverlay.classList.add('show');
    deleteModal.classList.add('show');
}

function closeDeleteModal() {
    deleteOverlay.classList.remove('show');
    deleteModal.classList.remove('show');
    
    setTimeout(() => {
        deleteModal.style.display = "none";
        deleteOverlay.style.display = "none";
    }, 300); // Match this timing with CSS transition duration
}

function deleteStudent() {
    const selectedRows = document.querySelectorAll("tbody input[type='checkbox']:checked");
    const deletedStudents = [];
    
    if (selectedRows.length > 0) {
        selectedRows.forEach(checkbox => {
            const row = checkbox.closest("tr");
            const studentId = row.dataset.studentId;
            
            if (studentsData[studentId]) {
                deletedStudents.push({...studentsData[studentId]});
                console.log(`Видалено студента ${studentsData[studentId].firstName} ${studentsData[studentId].lastName} з ID: ${studentId}`);
                delete studentsData[studentId];
            }
            
            row.remove();
        });
    } else if (studentRowToDelete) {
        const studentId = studentRowToDelete.dataset.studentId;
        
        if (studentsData[studentId]) {
            deletedStudents.push({...studentsData[studentId]});
            console.log(`Видалено студента ${studentsData[studentId].firstName} ${studentsData[studentId].lastName} з ID: ${studentId}`);
            delete studentsData[studentId];
        }
        
        studentRowToDelete.remove();
    }
    
    // Log deleted data
    if (deletedStudents.length > 0) {
        console.log('Видалені записи:', JSON.stringify(deletedStudents, null, 2));
    }
    
    // Log updated data after deletion
    console.log('Оновлені дані студентів:');
    console.log(JSON.stringify(studentsData, null, 2));
    
    closeDeleteModal();
    updateRowActions();
}

confirmDeleteBtn.addEventListener("click", deleteStudent);
cancelDeleteBtn.addEventListener("click", closeDeleteModal);
deleteCloseBtn.addEventListener("click", closeDeleteModal);

document.querySelector("tbody").addEventListener("click", function (event) {
    if (event.target.closest(".delete-btn")) {
        const row = event.target.closest("tr");
        const studentName = row.cells[2].textContent;
        openDeleteModal(row, studentName);
    }
});

// Ініціалізуємо початкові рядки після завантаження сторінки
window.addEventListener('DOMContentLoaded', function() {
    initializeTableRows();
    initValidation(); // Initialize form validation
    console.log('Таблицю студентів ініціалізовано з ID');
    console.log('Початкові дані студентів:');
    console.log(JSON.stringify(studentsData, null, 2));
});

// if ('serviceWorker' in navigator) {
//     window.addEventListener('load', () => {
//       navigator.serviceWorker.register('service-worker.js')
//         .then((registration) => {
//           console.log('Service Worker зареєстровано:', registration);
//         })
//         .catch((error) => {
//           console.log('Помилка реєстрації Service Worker:', error);
//         });
//     });
//   }

