const modal = document.getElementById("student-modal");
const overlay = document.getElementById("modal-overlay");
const addBtn = document.getElementById("add-btn");
const createBtn = document.getElementById("create-btn");
const closeBtn = document.getElementById("close-btn");
const cancelBtn = document.getElementById("cancel-btn");
const tableBody = document.querySelector("#students-table tbody");
const modalTitle = document.querySelector('#student-modal .modal-header h2'); // More specific selector
const submitButton = document.getElementById('create-btn');
const selectAllCheckbox = document.getElementById("select-all");
const deleteModal = document.getElementById("delete-modal");
const deleteOverlay = document.getElementById("modal-overlay"); // Re-use overlay
const confirmDeleteBtn = document.getElementById("delete-confirm-btn");
const cancelDeleteBtn = document.getElementById("delete-cancel-btn");
const deleteCloseBtn = document.getElementById("delete-close-btn");
const deleteMessage = document.getElementById("delete-message");
const paginationContainer = document.querySelector(".pagination-container");

// NOTE: We assume 'isLoggedIn' is already defined globally by header.js

let isEditMode = false;
let editingRow = null;
let studentsData = {}; // Will be populated from fetch
let studentRowToDelete = null;
let currentPage = 1; // Keep track of the current page
const studentsPerPage = 5; // Number of students per page

// --- Helper Functions ---
function formatDateForDisplay(dateString) {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return 'N/A'; // Or handle invalid date appropriately
    }
    const [year, month, day] = dateString.split('-');
    return `${day}.${month}.${year}`;
}

function formatDateForInput(dateString) {
    if (!dateString || !/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) {
        return ''; // Or handle invalid date appropriately
    }
    const [day, month, year] = dateString.split('.');
    return `${year}-${month}-${day}`;
}

// --- Core Data Handling & Rendering ---

function renderStudentRow(student) {
    const row = document.createElement("tr");
    row.dataset.studentId = student.id; // Use DB ID

    const statusClass = student.status == 1 ? 'online' : 'offline';
    const formattedBirthday = formatDateForDisplay(student.birthday);
    const nameParts = student.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Store data in JS object
    studentsData[student.id] = {
        id: student.id,
        group: student.student_group,
        firstName: firstName,
        lastName: lastName,
        gender: student.gender,
        birthday: formattedBirthday, // Store display format
        status: statusClass,
        db_birthday: student.birthday // Store original DB format if needed for editing
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

async function fetchAndRenderStudents(page = 1) { // Accept page number
    currentPage = page; // Update current page tracker
    try {
        // Request specific page and limit
        const response = await fetch(`/studentApp/api/get_students.php?page=${page}&limit=${studentsPerPage}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const responseData = await response.json();
        const students = responseData.students;
        const pagination = responseData.pagination;

        // Clear current table body and data
        tableBody.innerHTML = '';
        studentsData = {};

        // Render rows for the current page
        students.forEach(student => {
            renderStudentRow(student);
        });

        // Update actions based on initial render
        updateRowActions();

        // Render pagination controls using the pagination data from API
        renderPaginationControls(pagination);

        console.log(`Students loaded for page ${page}:`, studentsData);

    } catch (error) {
        console.error(`Failed to fetch students for page ${page}:`, error);
        tableBody.innerHTML = `<tr><td colspan="7">Failed to load student data for page ${page}. Please try again later.</td></tr>`;
        if (paginationContainer) paginationContainer.innerHTML = ''; // Clear pagination on error
    }
}

// --- Pagination Rendering ---
function renderPaginationControls(pagination) {
    if (!paginationContainer || !pagination || pagination.totalPages <= 0) {
        if (paginationContainer) paginationContainer.innerHTML = ''; // Clear if no pages
        return;
    }

    const { currentPage, totalPages } = pagination;
    paginationContainer.innerHTML = ''; // Clear existing controls

    // Previous Button
    const prevButton = document.createElement('button');
    prevButton.classList.add('page-btn', 'prev');
    prevButton.innerHTML = '&lt;'; // <
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            fetchAndRenderStudents(currentPage - 1);
        }
    });
    paginationContainer.appendChild(prevButton);

    // Page Number Buttons (simplified example: show all pages)
    // TODO: Implement more sophisticated logic for many pages (e.g., ellipsis)
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

    // Next Button
    const nextButton = document.createElement('button');
    nextButton.classList.add('page-btn', 'next');
    nextButton.innerHTML = '&gt;'; // >
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            fetchAndRenderStudents(currentPage + 1);
        }
    });
    paginationContainer.appendChild(nextButton);
}

// REMOVED: initializeTableRows() - functionality merged into fetchAndRenderStudents and renderStudentRow

// --- Modal Handling (Add/Edit) ---

function openAddModal() {
    if (!isLoggedIn) {
        alert("Спочатку потрібно увійти в систему");
        return;
    }
    isEditMode = false;
    editingRow = null;
    document.getElementById("student-form").reset(); // Clear form
    clearAllErrors(); // Clear validation errors
    touchedFields.clear(); // Clear touched fields

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
    clearAllErrors(); // Clear validation errors
    touchedFields.clear(); // Clear touched fields

    const studentId = row.dataset.studentId;
    const studentData = studentsData[studentId];
    if (!studentData) {
        console.error(`Студента з ID ${studentId} не знайдено`);
        closeModal(); // Close modal if data is missing
        return;
    }

    document.getElementById("student-group").value = studentData.group;
    document.getElementById("first-name").value = studentData.firstName;
    document.getElementById("last-name").value = studentData.lastName;
    document.getElementById("gender").value = studentData.gender === 'M' ? 'Male' : (studentData.gender === 'F' ? 'Female' : '');
    document.getElementById("birthday").value = formatDateForInput(studentData.birthday); // Use helper

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
            document.getElementById("student-form").reset(); // Reset form on close
            clearAllErrors(); // Clear validation errors
            touchedFields.clear();
        }, 300); // Match CSS transition duration
    }
}

// --- Save Student (Add/Edit) ---
// TODO: Implement actual saving to backend via API call
async function saveStudent() { // Make function async
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
    const gender = document.getElementById("gender").value; // 'Male' or 'Female'
    const birthday = document.getElementById("birthday").value; // YYYY-MM-DD

    const studentPayload = {
        student_group: group,
        name: `${firstName} ${lastName}`,
        gender: gender ? gender[0] : null, // 'M' or 'F'
        birthday: birthday,
        // status might be handled by backend or default
    };


    if (isEditMode && editingRow) {
        const studentId = editingRow.dataset.studentId;
        studentPayload.id = studentId;
        console.log("Attempting to EDIT student:", studentPayload);

        try {
            const response = await fetch('/studentApp/api/update_student.php', { // Use async/await
                method: 'POST', // Or 'PUT'
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(studentPayload)
            });

            const data = await response.json(); // Always try to parse JSON

            if (response.ok && data.success) {
                 console.log(`Successfully updated student ID: ${studentId}`);
                 fetchAndRenderStudents(currentPage); // Refresh current page on success
                 closeModal();
            } else {
                // Handle server-side validation errors or other failures
                let errorMessage = 'Failed to update student.';
                if (data.errors) {
                    // Basic error display: join messages. Needs better UI integration.
                    errorMessage += ' Errors: ' + Object.values(data.errors).join(', ');
                    // TODO: Implement displaying errors next to form fields
                } else if (data.message) {
                    errorMessage = data.message; // Use server message if available
                }
                 console.error('Error updating student:', data);
                 alert(errorMessage); // Show error to user
            }
        } catch (error) {
             console.error('Network or parsing error updating student:', error);
             alert('An error occurred while trying to update the student. Please check your connection and try again.');
        }
        // --- End API call ---

    } else {
        // --- ADDING a new student ---
        console.log("Attempting to ADD student:", studentPayload);
        try {
            const response = await fetch('/studentApp/api/add_student.php', { // Use the actual API endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(studentPayload)
            });

            const data = await response.json(); // Always try to parse JSON

            if (response.ok && data.success) {
                console.log(`Successfully added student with ID: ${data.id}`);
                // Go to the last page potentially, or just refresh page 1/current page
                // For simplicity, refreshing current page or page 1 if needed
                fetchAndRenderStudents(1); // Or fetchAndRenderStudents(currentPage) or calculate last page
                closeModal();
            } else {
                // Handle server-side validation errors or other failures
                let errorMessage = 'Failed to add student.';
                 if (data.errors) {
                    errorMessage += '\nErrors:\n' + Object.entries(data.errors)
                        .map(([field, msg]) => `- ${field.charAt(0).toUpperCase() + field.slice(1)}: ${msg}`)
                        .join('\n');
                    // TODO: Implement displaying errors next to form fields
                } else if (data.message) {
                    errorMessage = data.message; // Use server message if available
                }
                console.error('Error adding student:', data);
                alert(errorMessage); // Show error to user
            }
        } catch (error) {
            console.error('Network or parsing error adding student:', error);
            alert('An error occurred while trying to add the student. Please check your connection and try again.');
        }
        // --- End API call ---

        // REMOVED: Simulation code is replaced by the actual API call above
        // fetchAndRenderStudents();
        // closeModal();
    }

    // REMOVED TEMPORARY calls from here as they are now inside the fetch logic
}


// --- Delete Student ---

function openDeleteModal(row, studentName) { // studentName might be outdated if using checkboxes
    if (!isLoggedIn) {
        alert("Спочатку потрібно увійти в систему для видалення");
        return;
    }
    studentRowToDelete = row; // Keep track of single row if delete button clicked directly

    const selectedRows = document.querySelectorAll("tbody input[type='checkbox']:checked");
    const selectedCount = selectedRows.length;

    if (selectedCount > 0) {
         deleteMessage.textContent = `Are you sure you want to delete ${selectedCount} selected student(s)?`;
         studentRowToDelete = null; // Prioritize checkbox selection
    } else if (row) {
        const studentId = row.dataset.studentId;
        const studentData = studentsData[studentId];
        const name = studentData ? `${studentData.firstName} ${studentData.lastName}` : 'this student';
        deleteMessage.textContent = `Are you sure you want to delete ${name}?`;
    } else {
        // Should not happen if called correctly
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
        deleteOverlay.classList.remove('show'); // Use the correct overlay variable
        setTimeout(() => {
            deleteModal.style.display = "none";
            deleteOverlay.style.display = "none";
        }, 300);
    }
    studentRowToDelete = null; // Clear the row reference
}

// TODO: Implement actual deletion via backend API call
async function deleteStudent() { // Make function async
    const selectedRows = document.querySelectorAll("tbody input[type='checkbox']:checked");
    let idsToDelete = [];

    if (selectedRows.length > 0) {
        selectedRows.forEach(checkbox => {
            const row = checkbox.closest("tr");
            if (row && row.dataset.studentId) { // Ensure row and dataset ID exist
                idsToDelete.push(row.dataset.studentId);
            }
        });
    } else if (studentRowToDelete && studentRowToDelete.dataset.studentId) { // Ensure row and dataset ID exist
        idsToDelete.push(studentRowToDelete.dataset.studentId);
    }


    if (idsToDelete.length === 0) {
        console.warn("No students selected or identified for deletion.");
        closeDeleteModal();
        return;
    }

    console.log("Attempting to DELETE students with IDs:", idsToDelete);

    try {
        const response = await fetch('/studentApp/api/delete_students.php', { // Use the actual API endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids: idsToDelete }) // Send IDs in the correct format
        });

        const data = await response.json(); // Always try to parse JSON

        if (response.ok && data.success) {
            console.log(`Delete operation successful: ${data.message}`);
            // Refresh the current page after deletion
            // Check if the current page becomes empty after deletion, if so, go to previous page
            fetchAndRenderStudents(currentPage).then(() => {
                // After fetch completes, check if the table body is now empty
                // And if currentPage is not the first page
                if (tableBody.children.length === 0 && currentPage > 1) {
                    fetchAndRenderStudents(currentPage - 1); // Go to previous page
                }
            });
            closeDeleteModal();
        } else {
            // Handle server-side errors or cases where deletion didn't happen
            let errorMessage = `Failed to delete student(s). ${data.message || 'Unknown error'}`;
            console.error('Error deleting student(s):', data);
            alert(errorMessage); // Show error to user
            closeDeleteModal(); // Still close modal on failure
        }
    } catch (error) {
        console.error('Network or parsing error deleting student(s):', error);
        alert('An error occurred while trying to delete the student(s). Please check your connection and try again.');
        closeDeleteModal(); // Still close modal on network error
    }

    // REMOVED: Temporary simulation code is replaced by the actual API call above
    // fetchAndRenderStudents();
    // closeDeleteModal();
}


// --- Row Actions & Checkboxes ---

function updateRowActions() {
    const rowCheckboxes = document.querySelectorAll("tbody input[type='checkbox']");
    let allChecked = rowCheckboxes.length > 0; // Assume true if there are rows, false otherwise
    let anyChecked = false;

    rowCheckboxes.forEach((checkbox) => {
        const row = checkbox.closest("tr");
        const editBtn = row.querySelector(".edit-btn");
        const deleteBtn = row.querySelector(".delete-btn");

        // Enable/disable based on login status AND checkbox state (only if logged in)
        const shouldBeEnabled = isLoggedIn && checkbox.checked;
        if (editBtn) editBtn.disabled = !shouldBeEnabled;
        if (deleteBtn) deleteBtn.disabled = !shouldBeEnabled;

        if (!checkbox.checked) allChecked = false;
        if (checkbox.checked) anyChecked = true;
    });

    // Update select-all checkbox state
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.disabled = !isLoggedIn || rowCheckboxes.length === 0; // Disable if logged out or no rows
    }

    // Optional: Enable/disable global delete/edit buttons if they exist based on 'anyChecked'
}


// --- Event Listeners ---

// Add/Edit Modal listeners
if (addBtn) addBtn.addEventListener("click", openAddModal);
if (createBtn) createBtn.addEventListener("click", saveStudent); // 'Create'/'Save' button
if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
if (closeBtn) closeBtn.addEventListener("click", closeModal);

// Delete Modal listeners
if (confirmDeleteBtn) confirmDeleteBtn.addEventListener("click", deleteStudent);
if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", closeDeleteModal);
if (deleteCloseBtn) deleteCloseBtn.addEventListener("click", closeDeleteModal);

// Table interaction listeners (using event delegation on tbody)
if (tableBody) {
    tableBody.addEventListener("click", function (event) {
        const editButton = event.target.closest(".edit-btn");
        const deleteButton = event.target.closest(".delete-btn");

        if (editButton && !editButton.disabled) {
            const row = editButton.closest("tr");
            openEditModal(row);
        } else if (deleteButton && !deleteButton.disabled) {
            const row = deleteButton.closest("tr");
            openDeleteModal(row); // Pass the specific row
        }
    });

    tableBody.addEventListener("change", function (event) {
        if (event.target.type === "checkbox") {
            if (!isLoggedIn) {
                event.target.checked = false; // Prevent checking if not logged in
                return;
            }
            updateRowActions();
        }
    });
}

// Select All checkbox listener
if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", function () {
        if (!isLoggedIn) return; // Prevent action if not logged in
        const checkboxes = document.querySelectorAll("tbody input[type='checkbox']");
        checkboxes.forEach(checkbox => checkbox.checked = selectAllCheckbox.checked);
        updateRowActions();
    });
}


// --- Initialization ---

window.addEventListener('DOMContentLoaded', function() {
    fetchAndRenderStudents(1); // Fetch page 1 on initial load
    initValidation(); // Initialize form validation listeners

    // Disable add button if not logged in
    if (!isLoggedIn && addBtn) {
        addBtn.disabled = true;
    }
    // Initial state for selectAll checkbox (will be updated after fetch)
    if (selectAllCheckbox) {
         selectAllCheckbox.disabled = !isLoggedIn;
    }

    console.log(`User logged in: ${isLoggedIn}`);
});


