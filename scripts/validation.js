
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
        message: "Please enter a valid birthday (age should be between 15 and 80 years)"
    }
};


const touchedFields = new Set();

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
    
    return age >= 15 && age <= 80;
}

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

function validateForm() {
    const validationMethod = getValidationMethod();
    
    if (validationMethod === "html") {
        const form = document.querySelector("#student-form");
        return form.checkValidity();
    }
    
    const fields = document.querySelectorAll('#student-form input:not([type="radio"]), #student-form select');
    fields.forEach(field => touchedFields.add(field.id));
    
    let isFormValid = true;
    fields.forEach(field => {
        if (!validateField(field)) {
            isFormValid = false;
        }
    });
    
    return isFormValid;
}

function getValidationMethod() {
    return document.getElementById("html-validation").checked ? "html" : "javascript";
}

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

function toggleHTMLValidation(enabled) {
    const form = document.querySelector("#student-form");
    const inputs = form.querySelectorAll('input:not([type="radio"]), select');
    
    form.setAttribute('novalidate', !enabled);
    
    inputs.forEach(input => {
        if (enabled) {
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
                    break;
            }
        } else {
            // Disable HTML validation
            input.removeAttribute('required');
            input.removeAttribute('pattern');
        }
    });
    
    touchedFields.clear();
    inputs.forEach(field => {
        clearError(field);
    });
}


function initValidation() {
    const validationMethods = document.querySelectorAll('input[name="validation-method"]');
    const form = document.querySelector("#student-form");
    const formFields = form.querySelectorAll('input:not([type="radio"]), select');
    
    setupDateValidation();
    
    validationMethods.forEach(method => {
        method.addEventListener('change', function() {
            toggleHTMLValidation(this.id === 'html-validation');
        });
    });
    
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
    
    document.getElementById('js-validation').checked = true;
    toggleHTMLValidation(false);
}
