// Validation configuration
const validations = {
    'student-group': {
        regex: /^[A-Za-z]{2}-\d{2}$/,
        message: "Group should be in format XX-YY (e.g., PZ-21)"
    },
    'first-name': {
        regex: /^[A-Za-zА-Яа-яЇїІіЄєҐґ\s\-]{2,50}$/,
        message: "Name should contain 2-50 characters (letters, spaces, hyphens)"
    },
    'last-name': {
        regex: /^[A-Za-zА-Яа-яЇїІіЄєҐґ\s\-]{2,50}$/,
        message: "Surname should contain 2-50 characters (letters, spaces, hyphens)"
    },
    'gender': {
        message: "Please select a gender"
    },
    'birthday': {
        message: "Please enter a valid birthday (age should be between 16 and 100 years)"
    }
};

// Track which fields have been interacted with
const touchedFields = new Set();

/**
 * Validates if the birthday date is within the acceptable age range (16-100)
 */
function validateBirthday(date) {
    const today = new Date();
    const birthDate = new Date(date);
    
    if (isNaN(birthDate.getTime())) {
        return false;
    }
    
    if (birthDate > today) {
        return false;
    }
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age >= 16 && age <= 100;
}

/**
 * Validates a specific form field and displays validation results
 */
function validateField(field, skipVisuals = false) {
    const fieldName = field.id;
    const formField = field.closest('.form-field');
    let errorElement = formField.querySelector('.error-message');
    const validation = validations[fieldName];
    let isValid = false;
    
    const shouldShowVisuals = touchedFields.has(fieldName);
    
    if (!skipVisuals) {
        clearError(field);
    }
    
    if (fieldName === 'birthday') {
        isValid = field.value && validateBirthday(field.value);
    } else if (fieldName === 'gender' || fieldName === 'student-group') {
        isValid = field.value !== '';
    } else if (validation && validation.regex) {
        isValid = validation.regex.test(field.value);
    } else {
        isValid = field.value.trim() !== '';
    }
    
    if (!skipVisuals && shouldShowVisuals) {
        if (!isValid && validation) {
            showError(field, validation.message);
        } else if (!isValid) {
            showError(field, "This field is required");
        } else {
            formField.classList.add('valid');
        }
    }
    
    return isValid;
}

/**
 * Shows error message for a field
 */
function showError(input, message) {
    const formField = input.closest('.form-field');
    let errorElement = formField.querySelector('.error-message');
    
    input.classList.add('error-input');
    formField.classList.add('error');
    
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        formField.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

/**
 * Clears error message for a field
 */
function clearError(input) {
    const formField = input.closest('.form-field');
    const errorElement = formField.querySelector('.error-message');
    
    input.classList.remove('error-input');
    formField.classList.remove('error');
    formField.classList.remove('valid');
    
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

/**
 * Validates the entire form
 */
function validateForm() {
    const validationMethod = getValidationMethod();
    
    // If using HTML validation, let the browser handle it
    if (validationMethod === "html") {
        const form = document.querySelector("#student-form");
        return form.checkValidity();
    }
    
    // For JS validation, mark all fields as touched
    const fields = document.querySelectorAll('#student-form input:not([type="radio"]), #student-form select');
    fields.forEach(field => touchedFields.add(field.id));
    
    // Validate each field
    let isFormValid = true;
    fields.forEach(field => {
        if (!validateField(field)) {
            isFormValid = false;
        }
    });
    
    return isFormValid;
}

/**
 * Get the selected validation method
 */
function getValidationMethod() {
    return document.getElementById("html-validation").checked ? "html" : "javascript";
}

/**
 * Setup date validation constraints
 */
function setupDateValidation() {
    const birthdayField = document.getElementById('birthday');
    const today = new Date();
    
    const maxDate = new Date(today);
    maxDate.setFullYear(today.getFullYear() - 16);
    
    const minDate = new Date(today);
    minDate.setFullYear(today.getFullYear() - 100);
    
    birthdayField.max = maxDate.toISOString().split('T')[0];
    birthdayField.min = minDate.toISOString().split('T')[0];
}

/**
 * Toggle HTML validation attributes
 */
function toggleHTMLValidation(enabled) {
    const form = document.querySelector("#student-form");
    const inputs = form.querySelectorAll('input:not([type="radio"]), select');
    
    form.setAttribute('novalidate', !enabled);
    
    inputs.forEach(input => {
        if (enabled) {
            // Enable HTML validation
            switch(input.id) {
                case 'student-group':
                    input.setAttribute('required', '');
                    input.setAttribute('pattern', '[A-Za-z]{2}-\\d{2}');
                    break;
                case 'first-name':
                case 'last-name':
                    input.setAttribute('required', '');
                    input.setAttribute('pattern', '[A-Za-zА-Яа-яЇїІіЄєҐґ\\s\\-]{2,50}');
                    break;
                case 'gender':
                    input.setAttribute('required', '');
                    break;
                case 'birthday':
                    input.setAttribute('required', '');
                    // Date constraints already set in setupDateValidation
                    break;
            }
        } else {
            // Disable HTML validation
            input.removeAttribute('required');
            input.removeAttribute('pattern');
            // Don't remove min/max for date field - we keep those for the UI
        }
    });
    
    // Reset all visual validation indicators
    touchedFields.clear();
    inputs.forEach(field => {
        clearError(field);
    });
}

/**
 * Initialize validation
 */
function initValidation() {
    const validationMethods = document.querySelectorAll('input[name="validation-method"]');
    const form = document.querySelector("#student-form");
    const formFields = form.querySelectorAll('input:not([type="radio"]), select');
    
    // Setup date validation constraints
    setupDateValidation();
    
    // Set up validation method toggle handlers
    validationMethods.forEach(method => {
        method.addEventListener('change', function() {
            toggleHTMLValidation(this.id === 'html-validation');
        });
    });
    
    // Set up field validation handlers
    formFields.forEach(field => {
        field.addEventListener('input', function() {
            touchedFields.add(field.id);
            if (getValidationMethod() === "javascript") {
                validateField(field);
            }
        });
        
        field.addEventListener('blur', function() {
            touchedFields.add(field.id);
            if (getValidationMethod() === "javascript") {
                validateField(field);
            }
        });
    });
    
    // Initialize validation method (default to JS)
    document.getElementById('js-validation').checked = true;
    toggleHTMLValidation(false);
}
