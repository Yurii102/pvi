const modal = document.getElementById("student-modal");
const overlay = document.getElementById("modal-overlay");
const addBtn = document.getElementById("add-btn");
const createBtn = document.getElementById("create-btn");
const closeBtn = document.getElementById("close-btn");
const cancelBtn = document.getElementById("cancel-btn");
const tableBody = document.querySelector("#students-table tbody");
const modalTitle = document.querySelector('#student-modal .modal-header h2');
const submitButton = document.getElementById('create-btn');
const selectAllCheckbox = document.getElementById("select-all");
const deleteModal = document.getElementById("delete-modal");
const deleteOverlay = document.getElementById("modal-overlay");
const confirmDeleteBtn = document.getElementById("delete-confirm-btn");
const cancelDeleteBtn = document.getElementById("delete-cancel-btn");
const deleteCloseBtn = document.getElementById("delete-close-btn");
const deleteMessage = document.getElementById("delete-message");
const paginationContainer = document.querySelector(".pagination-container");

let isEditMode = false;
let editingRow = null;
let studentsData = {};
let studentRowToDelete = null;
let currentPage = 1;
const studentsPerPage = 5;

function formatDateForDisplay(dateString) {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return 'N/A';
    }
    const [year, month, day] = dateString.split('-');
    return `${day}.${month}.${year}`;
}

function formatDateForInput(dateString) {
    if (!dateString || !/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) {
        return '';
    }
    const [day, month, year] = dateString.split('.');
    return `${year}-${month}-${day}`;
}

function renderStudentRow(student) {
    const row = document.createElement("tr");
    row.dataset.studentId = student.id;

    const statusClass = student.status == 1 ? 'online' : 'offline';
    const formattedBirthday = formatDateForDisplay(student.birthday);
    const nameParts = student.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    studentsData[student.id] = {
        id: student.id,
        group: student.student_group,
        firstName: firstName,
        lastName: lastName,
        gender: student.gender,
        birthday: formattedBirthday,
        status: statusClass,
        db_birthday: student.birthday
    };

    row.innerHTML = `
        <td><input type="checkbox" aria-label="checkbox items" ${!isLoggedIn ? 'disabled' : ''}></td>
        <td><strong>${student.student_group || 'N/A'}</strong></td>
        <td><strong>${student.name || 'N/A'}</strong></td>
        <td>${student.gender || 'N/A'}</td>
        <td><strong>${formattedBirthday}</strong></td>
        <td><span class="status ${statusClass}"></span></td>
        <td>
            <button class="edit-btn" ${!isLoggedIn ? 'disabled' : ''}><span class="material-icons">edit</span></button>
            <button class="delete-btn" ${!isLoggedIn ? 'disabled' : ''}><span class="material-icons">delete</span></button>
        </td>
    `;
    tableBody.appendChild(row);
}

async function fetchAndRenderStudents(page = 1) {
    currentPage = page;
    try {
        const response = await fetch(`/studentApp/api/get_students.php?page=${page}&limit=${studentsPerPage}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const responseData = await response.json();
        const students = responseData.students;
        const pagination = responseData.pagination;

        tableBody.innerHTML = '';
        studentsData = {};

        students.forEach(student => {
            renderStudentRow(student);
        });

        updateRowActions();
        renderPaginationControls(pagination);

        console.log(`Students loaded for page ${page}:`, studentsData);

    } catch (error) {
        console.error(`Failed to fetch students for page ${page}:`, error);
        tableBody.innerHTML = `<tr><td colspan="7">Failed to load student data for page ${page}. Please try again later.</td></tr>`;
        if (paginationContainer) paginationContainer.innerHTML = '';
    }
}

function renderPaginationControls(pagination) {
    if (!paginationContainer || !pagination || pagination.totalPages <= 0) {
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const { currentPage, totalPages } = pagination;
    paginationContainer.innerHTML = '';

    const prevButton = document.createElement('button');
    prevButton.classList.add('page-btn', 'prev');
    prevButton.innerHTML = '&lt;';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            fetchAndRenderStudents(currentPage - 1);
        }
    });
    paginationContainer.appendChild(prevButton);

    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.classList.add('page-btn');
        pageButton.textContent = i;
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.addEventListener('click', () => {
            if (i !== currentPage) {
                fetchAndRenderStudents(i);
            }
        });
        paginationContainer.appendChild(pageButton);
    }

    const nextButton = document.createElement('button');
    nextButton.classList.add('page-btn', 'next');
    nextButton.innerHTML = '&gt;';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            fetchAndRenderStudents(currentPage + 1);
        }
    });
    paginationContainer.appendChild(nextButton);
}

function openAddModal() {
    if (!isLoggedIn) {
        alert("Спочатку потрібно увійти в систему");
        return;
    }
    isEditMode = false;
    editingRow = null;
    document.getElementById("student-form").reset();
    clearAllErrors();
    touchedFields.clear();

    modalTitle.textContent = "Add student";
    submitButton.textContent = "Create";

    overlay.style.display = "block";
    modal.style.display = "block";

    modal.offsetWidth;
    overlay.classList.add('show');
    modal.classList.add('show');
}

function openEditModal(row) {
    if (!isLoggedIn) {
        alert("Спочатку потрібно увійти в систему для редагування");
        return;
    }
    isEditMode = true;
    editingRow = row;
    clearAllErrors();
    touchedFields.clear();

    const studentId = row.dataset.studentId;
    const studentData = studentsData[studentId];
    if (!studentData) {
        console.error(`Студента з ID ${studentId} не знайдено`);
        closeModal();
        return;
    }

    document.getElementById("student-group").value = studentData.group;
    document.getElementById("first-name").value = studentData.firstName;
    document.getElementById("last-name").value = studentData.lastName;
    document.getElementById("gender").value = studentData.gender === 'M' ? 'Male' : (studentData.gender === 'F' ? 'Female' : '');
    document.getElementById("birthday").value = formatDateForInput(studentData.birthday);

    modalTitle.textContent = "Edit student";
    submitButton.textContent = "Save";

    overlay.style.display = "block";
    modal.style.display = "block";

    modal.offsetWidth;
    overlay.classList.add('show');
    modal.classList.add('show');
}

function closeModal() {
    if (modal) {
        modal.classList.remove('show');
        overlay.classList.remove('show');
        setTimeout(() => {
            modal.style.display = "none";
            overlay.style.display = "none";
            document.getElementById("student-form").reset();
            clearAllErrors();
            touchedFields.clear();
        }, 300);
    }
}

async function saveStudent() {
    if (!validateForm()) {
        if (document.getElementById("html-validation").checked) {
            const form = document.querySelector("#student-form");
            form.reportValidity();
        }
        return;
    }

    const group = document.getElementById("student-group").value;
    const firstName = document.getElementById("first-name").value;
    const lastName = document.getElementById("last-name").value;
    const gender = document.getElementById("gender").value;
    const birthday = document.getElementById("birthday").value;

    const studentPayload = {
        student_group: group,
        name: `${firstName} ${lastName}`,
        gender: gender ? gender[0] : null,
        birthday: birthday,
    };

    if (isEditMode && editingRow) {
        const studentId = editingRow.dataset.studentId;
        studentPayload.id = studentId;
        console.log("Attempting to EDIT student:", studentPayload);

        try {
            const response = await fetch('/studentApp/api/update_student.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(studentPayload)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                console.log(`Successfully updated student ID: ${studentId}`);
                fetchAndRenderStudents(currentPage);
                closeModal();
            } else {
                let errorMessage = 'Failed to update student.';
                if (data.errors) {
                    errorMessage += ' Errors: ' + Object.values(data.errors).join(', ');
                } else if (data.message) {
                    errorMessage = data.message;
                }
                console.error('Error updating student:', data);
                alert(errorMessage);
            }
        } catch (error) {
            console.error('Network or parsing error updating student:', error);
            alert('An error occurred while trying to update the student. Please check your connection and try again.');
        }

    } else {
        console.log("Attempting to ADD student:", studentPayload);
        try {
            const response = await fetch('/studentApp/api/add_student.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(studentPayload)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                console.log(`Successfully added student with ID: ${data.id}`);
                fetchAndRenderStudents(1);
                closeModal();
            } else {
                let errorMessage = 'Failed to add student.';
                if (data.errors) {
                    errorMessage += '\nErrors:\n' + Object.entries(data.errors)
                        .map(([field, msg]) => `- ${field.charAt(0).toUpperCase() + field.slice(1)}: ${msg}`)
                        .join('\n');
                } else if (data.message) {
                    errorMessage = data.message;
                }
                console.error('Error adding student:', data);
                alert(errorMessage);
            }
        } catch (error) {
            console.error('Network or parsing error adding student:', error);
            alert('An error occurred while trying to add the student. Please check your connection and try again.');
        }
    }
}

function openDeleteModal(row, studentName) {
    if (!isLoggedIn) {
        alert("Спочатку потрібно увійти в систему для видалення");
        return;
    }
    studentRowToDelete = row;

    const selectedRows = document.querySelectorAll("tbody input[type='checkbox']:checked");
    const selectedCount = selectedRows.length;

    if (selectedCount > 0) {
        deleteMessage.textContent = `Are you sure you want to delete ${selectedCount} selected student(s)?`;
        studentRowToDelete = null;
    } else if (row) {
        const studentId = row.dataset.studentId;
        const studentData = studentsData[studentId];
        const name = studentData ? `${studentData.firstName} ${studentData.lastName}` : 'this student';
        deleteMessage.textContent = `Are you sure you want to delete ${name}?`;
    } else {
        console.error("OpenDeleteModal called incorrectly");
        return;
    }

    deleteOverlay.style.display = "block";
    deleteModal.style.display = "block";

    deleteModal.offsetWidth;
    deleteOverlay.classList.add('show');
    deleteModal.classList.add('show');
}

function closeDeleteModal() {
    if (deleteModal) {
        deleteModal.classList.remove('show');
        deleteOverlay.classList.remove('show');
        setTimeout(() => {
            deleteModal.style.display = "none";
            deleteOverlay.style.display = "none";
        }, 300);
    }
    studentRowToDelete = null;
}

async function deleteStudent() {
    const selectedRows = document.querySelectorAll("tbody input[type='checkbox']:checked");
    let idsToDelete = [];

    if (selectedRows.length > 0) {
        selectedRows.forEach(checkbox => {
            const row = checkbox.closest("tr");
            if (row && row.dataset.studentId) {
                idsToDelete.push(row.dataset.studentId);
            }
        });
    } else if (studentRowToDelete && studentRowToDelete.dataset.studentId) {
        idsToDelete.push(studentRowToDelete.dataset.studentId);
    }

    if (idsToDelete.length === 0) {
        console.warn("No students selected or identified for deletion.");
        closeDeleteModal();
        return;
    }

    console.log("Attempting to DELETE students with IDs:", idsToDelete);

    try {
        const response = await fetch('/studentApp/api/delete_students.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids: idsToDelete })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log(`Delete operation successful: ${data.message}`);
            fetchAndRenderStudents(currentPage).then(() => {
                if (tableBody.children.length === 0 && currentPage > 1) {
                    fetchAndRenderStudents(currentPage - 1);
                }
            });
            closeDeleteModal();
        } else {
            let errorMessage = `Failed to delete student(s). ${data.message || 'Unknown error'}`;
            console.error('Error deleting student(s):', data);
            alert(errorMessage);
            closeDeleteModal();
        }
    } catch (error) {
        console.error('Network or parsing error deleting student(s):', error);
        alert('An error occurred while trying to delete the student(s). Please check your connection and try again.');
        closeDeleteModal();
    }
}

function updateRowActions() {
    const rowCheckboxes = document.querySelectorAll("tbody input[type='checkbox']");
    let allChecked = rowCheckboxes.length > 0;
    let anyChecked = false;

    rowCheckboxes.forEach((checkbox) => {
        const row = checkbox.closest("tr");
        const editBtn = row.querySelector(".edit-btn");
        const deleteBtn = row.querySelector(".delete-btn");

        const shouldBeEnabled = isLoggedIn && checkbox.checked;
        if (editBtn) editBtn.disabled = !shouldBeEnabled;
        if (deleteBtn) deleteBtn.disabled = !shouldBeEnabled;

        if (!checkbox.checked) allChecked = false;
        if (checkbox.checked) anyChecked = true;
    });

    if (selectAllCheckbox) {
        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.disabled = !isLoggedIn || rowCheckboxes.length === 0;
    }
}

if (addBtn) addBtn.addEventListener("click", openAddModal);
if (createBtn) createBtn.addEventListener("click", saveStudent);
if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
if (closeBtn) closeBtn.addEventListener("click", closeModal);

if (confirmDeleteBtn) confirmDeleteBtn.addEventListener("click", deleteStudent);
if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", closeDeleteModal);
if (deleteCloseBtn) deleteCloseBtn.addEventListener("click", closeDeleteModal);

if (tableBody) {
    tableBody.addEventListener("click", function (event) {
        const editButton = event.target.closest(".edit-btn");
        const deleteButton = event.target.closest(".delete-btn");

        if (editButton && !editButton.disabled) {
            const row = editButton.closest("tr");
            openEditModal(row);
        } else if (deleteButton && !deleteButton.disabled) {
            const row = deleteButton.closest("tr");
            openDeleteModal(row);
        }
    });

    tableBody.addEventListener("change", function (event) {
        if (event.target.type === "checkbox") {
            if (!isLoggedIn) {
                event.target.checked = false;
                return;
            }
            updateRowActions();
        }
    });
}

if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", function () {
        if (!isLoggedIn) return;
        const checkboxes = document.querySelectorAll("tbody input[type='checkbox']");
        checkboxes.forEach(checkbox => checkbox.checked = selectAllCheckbox.checked);
        updateRowActions();
    });
}

window.addEventListener('DOMContentLoaded', function() {
    fetchAndRenderStudents(1);
    initValidation();

    if (!isLoggedIn && addBtn) {
        addBtn.disabled = true;
    }
    if (selectAllCheckbox) {
        selectAllCheckbox.disabled = !isLoggedIn;
    }

    console.log(`User logged in: ${isLoggedIn}`);
});


