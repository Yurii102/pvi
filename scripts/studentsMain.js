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
    
    modal.style.display = "block";
    overlay.style.display = "block";
}

function openEditModal(row) {
    isEditMode = true;
    editingRow = row;
    
    const group = row.cells[1].textContent.trim();
    const fullName = row.cells[2].textContent.trim();
    const gender = row.cells[3].textContent.trim();
    const birthday = row.cells[4].textContent.trim();
    
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[1] : '';
    
    document.getElementById("student-group").value = group;
    document.getElementById("first-name").value = firstName;
    document.getElementById("last-name").value = lastName;
    
    if (gender === 'M') {
        document.getElementById("gender").value = "Male";
    } else if (gender === 'F') {
        document.getElementById("gender").value = "Female";
    }
    
    if (birthday) {
        const dateParts = birthday.split('.');
        if (dateParts.length === 3) {
            const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            document.getElementById("birthday").value = formattedDate;
        }
    }
    
    modalTitle.textContent = "Edit student";
    submitButton.textContent = "Save";
    
    modal.style.display = "block";
    overlay.style.display = "block";
}

function closeModal() {
    modal.style.display = "none";
    overlay.style.display = "none";
}

function saveStudent() {
    const group = document.getElementById("student-group").value;
    const firstName = document.getElementById("first-name").value;
    const lastName = document.getElementById("last-name").value;
    const gender = document.getElementById("gender").value;
    const birthday = document.getElementById("birthday").value;

    if (!group || !firstName || !lastName || !gender || !birthday) {
        alert("Будь ласка, заповніть всі поля!");
        return;
    }

    const formattedDate = formatDate(birthday);
    
    if (isEditMode && editingRow) {
        editingRow.cells[1].innerHTML = `<strong>${group}</strong>`;
        editingRow.cells[2].innerHTML = `<strong>${firstName} ${lastName}</strong>`;
        editingRow.cells[3].textContent = gender[0];
        editingRow.cells[4].innerHTML = `<strong>${formattedDate}</strong>`;
    } else {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><input type="checkbox"></td>
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
    }
    
    updateRowActions();
    closeModal();
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

//Видалення студента

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
        const studentName = selectedRow.cells[2].textContent.trim();
        deleteMessage.textContent = `Are you sure you want to delete student ${studentName}?`;
    } else if (selectedCount > 1) {
        deleteMessage.textContent = `Are you sure you want to delete ${selectedCount} students?`;
    }
    
    deleteModal.style.display = "block";
    deleteOverlay.style.display = "block";
}

function closeDeleteModal() {
    deleteModal.style.display = "none";
    deleteOverlay.style.display = "none";
}

function deleteStudent() {
    const selectedRows = document.querySelectorAll("tbody input[type='checkbox']:checked");
    
    if (selectedRows.length > 0) {
        selectedRows.forEach(checkbox => {
            const row = checkbox.closest("tr");
            row.remove();
        });
    } else if (studentRowToDelete) {
        studentRowToDelete.remove();
    }
    
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



